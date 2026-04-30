'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiAddLine, RiDeleteBinLine, RiEditLine, RiCheckLine,
  RiCloseLine, RiMapPinLine, RiRefreshLine
} from 'react-icons/ri';
import { toast } from 'react-hot-toast';

const VELVET = {
  black: '#0C0B10', surface: '#161520', border: '#1E1D2A',
  gold: '#C9A84C', goldLight: '#E8C97A', cream: '#F5F0E8', muted: '#9B96A8',
  purple: '#7C3AED'
};

const ZONE_TYPES = [
  { value: 'standard',       label: 'Standard',       color: '#9B96A8' },
  { value: 'vip',            label: 'VIP',            color: '#C9A84C' },
  { value: 'bar_counter',    label: 'Bar Counter',    color: '#FF4F18' },
  { value: 'outdoor',        label: 'Outdoor',        color: '#10B981' },
  { value: 'private',        label: 'Private',        color: '#7C3AED' },
  { value: 'dance_floor',    label: 'Dance Floor',    color: '#EC4899' },
  { value: 'stage',          label: 'Stage',          color: '#F59E0B' },
  { value: 'lounge',         label: 'Lounge',         color: '#0EA5E9' },
];

const PRESET_COLORS = [
  '#C9A84C', '#7C3AED', '#10B981', '#FF4F18', '#EC4899',
  '#0EA5E9', '#F59E0B', '#EF4444', '#9B96A8', '#6366F1'
];

export default function ZoneManager({ restaurantId, token, floorplans = [] }) {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFloorplan, setSelectedFloorplan] = useState(floorplans[0] || null);
  const [mode, setMode] = useState('list'); // 'list' | 'create' | 'edit'
  const [editingZone, setEditingZone] = useState(null);
  const [selectedTableIds, setSelectedTableIds] = useState(new Set());
  const [floorplanObjects, setFloorplanObjects] = useState([]);

  // Zone form state
  const [form, setForm] = useState({
    name: '', type: 'standard', color: '#C9A84C',
    basePrice: '', minimumSpend: '', depositRequired: false,
    depositAmount: '', peakMultiplier: '1.0', eventMultiplier: '1.0'
  });

  // 3D refs
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const frameRef = useRef(null);
  const tableObjectsRef = useRef([]); // { mesh, tableId, pos }

  // ── Fetch zones ──────────────────────────────────────────────────────────────
  const fetchZones = useCallback(async () => {
    if (!restaurantId || !token) return;
    setLoading(true);
    try {
      const fp = selectedFloorplan?._id;
      const url = fp
        ? `/api/venues/${restaurantId}/zones?floorplanId=${fp}`
        : `/api/venues/${restaurantId}/zones`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setZones((await res.json()).zones || []);
    } catch (e) { console.error('ZoneManager fetch error:', e); }
    finally { setLoading(false); }
  }, [restaurantId, token, selectedFloorplan]);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  // ── Load floorplan objects (tables) ──────────────────────────────────────────
  useEffect(() => {
    if (!selectedFloorplan) return;
    const objects = selectedFloorplan.data?.objects || [];
    const tables = objects.filter(o => {
      const ud = o.userData;
      if (!ud) return false;
      const m = ud instanceof Map ? Object.fromEntries(ud) : ud;
      return m.isTable === true;
    });
    setFloorplanObjects(tables);
  }, [selectedFloorplan]);

  // ── Three.js scene ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'list' || !canvasRef.current) return;

    const container = canvasRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.setClearColor(0x0C0B10, 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(10, 15, 10);
    scene.add(dir);

    // Camera — top-down angled view
    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 200);
    camera.position.set(0, 14, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 4;
    controls.maxDistance = 40;
    controlsRef.current = controls;

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshPhongMaterial({ color: 0x111118 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid
    const grid = new THREE.GridHelper(30, 30, 0x1E1D2A, 0x1E1D2A);
    scene.add(grid);

    // Place floorplan objects
    tableObjectsRef.current = [];
    const allObjects = selectedFloorplan?.data?.objects || [];

    allObjects.forEach(obj => {
      const pos = obj.position || [0, 0, 0];
      const rot = obj.rotation || {};
      const ud = obj.userData;
      const udPlain = ud instanceof Map ? Object.fromEntries(ud) : (ud || {});
      const isTable = udPlain.isTable === true;

      let mesh;
      if (isTable) {
        // Distinctive table marker
        const geo = new THREE.CylinderGeometry(0.45, 0.45, 0.12, 20);
        const mat = new THREE.MeshPhongMaterial({ color: 0x2A2030, shininess: 60 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.userData.tableId = obj.objectId;
        mesh.userData.isTableMarker = true;

        // Check if this table is in an existing zone
        const zone = zones.find(z => z.tableIds.includes(obj.objectId));
        if (zone) {
          const c = parseInt(zone.color.replace('#', ''), 16);
          mesh.material.color.setHex(c);
          mesh.material.emissive.setHex(c);
          mesh.material.emissiveIntensity = 0.15;
        }

        // Table ID label (floating ring)
        const ringGeo = new THREE.TorusGeometry(0.5, 0.04, 8, 30);
        const ringMat = new THREE.MeshPhongMaterial({ color: 0x333344 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(pos[0] || 0, (pos[1] || 0) + 0.13, pos[2] || 0);
        scene.add(ring);
        mesh.userData.ring = ring;

        tableObjectsRef.current.push({ mesh, tableId: obj.objectId, pos });
      } else {
        // Non-table furniture → gray box placeholder
        const scale = obj.scale || [1, 1, 1];
        const size = [
          Math.max(0.3, (scale[0] || 1) * 0.8),
          Math.max(0.2, (scale[1] || 1) * 0.5),
          Math.max(0.3, (scale[2] || 1) * 0.8)
        ];
        const geo = new THREE.BoxGeometry(...size);
        const mat = new THREE.MeshPhongMaterial({ color: 0x1E1D2A });
        mesh = new THREE.Mesh(geo, mat);
      }

      mesh.position.set(pos[0] || 0, (pos[1] || 0) + (isTable ? 0.06 : 0.1), pos[2] || 0);
      if (rot.x !== undefined) mesh.rotation.set(rot.x || 0, rot.y || 0, rot.z || 0);
      scene.add(mesh);
    });

    // Update visuals for selected tables
    updateSelectionVisuals();

    // Raycasting
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let mouseDownPos = { x: 0, y: 0 };

    const onMouseDown = (e) => { mouseDownPos = { x: e.clientX, y: e.clientY }; isDragging = false; };
    const onMouseMove = (e) => {
      const dx = Math.abs(e.clientX - mouseDownPos.x);
      const dy = Math.abs(e.clientY - mouseDownPos.y);
      if (dx > 4 || dy > 4) isDragging = true;
    };
    const onClick = (e) => {
      if (isDragging) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const tableMeshes = tableObjectsRef.current.map(t => t.mesh);
      const hits = raycaster.intersectObjects(tableMeshes, false);
      if (hits.length > 0) {
        const hit = hits[0].object;
        const tableId = hit.userData.tableId;
        if (tableId) {
          setSelectedTableIds(prev => {
            const next = new Set(prev);
            if (next.has(tableId)) next.delete(tableId);
            else next.add(tableId);
            return next;
          });
        }
      }
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onClick);

    // Resize
    const onResize = () => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    // Animate
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [mode, selectedFloorplan, zones]);

  // Update visual highlight when selectedTableIds changes
  const updateSelectionVisuals = useCallback(() => {
    tableObjectsRef.current.forEach(({ mesh, tableId }) => {
      const isSelected = selectedTableIds.has(tableId);
      const inZone = zones.find(z => z.tableIds.includes(tableId));

      if (isSelected) {
        mesh.material.color.set(VELVET.gold);
        mesh.material.emissive.set(VELVET.gold);
        mesh.material.emissiveIntensity = 0.4;
        if (mesh.userData.ring) {
          mesh.userData.ring.material.color.set(VELVET.gold);
          mesh.userData.ring.material.emissive.set(VELVET.gold);
          mesh.userData.ring.material.emissiveIntensity = 0.6;
        }
      } else if (inZone) {
        const c = inZone.color || VELVET.gold;
        mesh.material.color.set(c);
        mesh.material.emissive.set(c);
        mesh.material.emissiveIntensity = 0.15;
        if (mesh.userData.ring) mesh.userData.ring.material.color.set(c);
      } else {
        mesh.material.color.set(0x2A2030);
        mesh.material.emissive.set(0x000000);
        mesh.material.emissiveIntensity = 0;
        if (mesh.userData.ring) mesh.userData.ring.material.color.set(0x333344);
      }
    });
  }, [selectedTableIds, zones]);

  useEffect(() => { updateSelectionVisuals(); }, [updateSelectionVisuals]);

  // ── Save zone ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name) { toast.error('Zone name is required'); return; }
    if (selectedTableIds.size === 0) { toast.error('Select at least one table'); return; }
    if (!selectedFloorplan) { toast.error('Select a floorplan first'); return; }

    const payload = {
      name: form.name,
      type: form.type,
      color: form.color,
      tableIds: Array.from(selectedTableIds),
      floorplanId: selectedFloorplan._id,
      pricing: {
        basePrice: parseFloat(form.basePrice) || 0,
        minimumSpend: parseFloat(form.minimumSpend) || 0,
        depositRequired: form.depositRequired,
        depositAmount: parseFloat(form.depositAmount) || 0,
        peakMultiplier: parseFloat(form.peakMultiplier) || 1.0,
        eventMultiplier: parseFloat(form.eventMultiplier) || 1.0
      }
    };

    try {
      const url = editingZone
        ? `/api/venues/${restaurantId}/zones/${editingZone._id}`
        : `/api/venues/${restaurantId}/zones`;
      const res = await fetch(url, {
        method: editingZone ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(editingZone ? 'Zone updated' : 'Zone created');
      setMode('list');
      setEditingZone(null);
      setSelectedTableIds(new Set());
      resetForm();
      fetchZones();
    } catch (e) {
      toast.error(e.message || 'Failed to save zone');
    }
  };

  const handleDeleteZone = async (zoneId) => {
    if (!confirm('Delete this zone?')) return;
    try {
      const res = await fetch(`/api/venues/${restaurantId}/zones/${zoneId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      toast.success('Zone deleted');
      fetchZones();
    } catch {
      toast.error('Failed to delete zone');
    }
  };

  const handleEditZone = (zone) => {
    setEditingZone(zone);
    setForm({
      name: zone.name,
      type: zone.type,
      color: zone.color,
      basePrice: zone.pricing?.basePrice?.toString() || '',
      minimumSpend: zone.pricing?.minimumSpend?.toString() || '',
      depositRequired: zone.pricing?.depositRequired || false,
      depositAmount: zone.pricing?.depositAmount?.toString() || '',
      peakMultiplier: zone.pricing?.peakMultiplier?.toString() || '1.0',
      eventMultiplier: zone.pricing?.eventMultiplier?.toString() || '1.0'
    });
    setSelectedTableIds(new Set(zone.tableIds || []));
    setMode('edit');
  };

  const resetForm = () => setForm({
    name: '', type: 'standard', color: '#C9A84C',
    basePrice: '', minimumSpend: '', depositRequired: false,
    depositAmount: '', peakMultiplier: '1.0', eventMultiplier: '1.0'
  });

  const startCreate = () => {
    resetForm();
    setEditingZone(null);
    setSelectedTableIds(new Set());
    setMode('create');
  };

  // ── RENDER ────────────────────────────────────────────────────────────────────
  const isEditorMode = mode === 'create' || mode === 'edit';

  return (
    <div style={{ color: VELVET.cream }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: VELVET.cream }}>
            {isEditorMode ? (mode === 'edit' ? 'Edit Zone' : 'Create Zone') : 'Zones'}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: VELVET.muted }}>
            {isEditorMode ? 'Click tables in the 3D view to assign them to this zone' : 'Define pricing zones per floorplan'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isEditorMode ? (
            <button onClick={() => { setMode('list'); resetForm(); setSelectedTableIds(new Set()); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
              style={{ background: VELVET.surface, color: VELVET.muted, border: `1px solid ${VELVET.border}` }}>
              <RiCloseLine /> Cancel
            </button>
          ) : (
            <>
              <button onClick={fetchZones} className="p-2 rounded-xl transition-opacity hover:opacity-60"
                style={{ background: VELVET.surface, color: VELVET.muted }}>
                <RiRefreshLine size={18} />
              </button>
              <button onClick={startCreate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
                style={{ background: VELVET.gold, color: '#0C0B10' }}>
                <RiAddLine /> Create Zone
              </button>
            </>
          )}
        </div>
      </div>

      {/* Floorplan selector */}
      {floorplans.length > 1 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {floorplans.map(fp => (
            <button
              key={fp._id}
              onClick={() => { setSelectedFloorplan(fp); setSelectedTableIds(new Set()); }}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: selectedFloorplan?._id === fp._id ? 'rgba(201,168,76,0.15)' : VELVET.surface,
                color: selectedFloorplan?._id === fp._id ? VELVET.gold : VELVET.muted,
                border: `1px solid ${selectedFloorplan?._id === fp._id ? VELVET.gold : VELVET.border}`
              }}
            >
              {fp.name}
            </button>
          ))}
        </div>
      )}

      {/* Editor mode: split layout */}
      {isEditorMode && (
        <div className="flex gap-5" style={{ minHeight: '540px' }}>
          {/* 3D Canvas */}
          <div className="flex-1 relative rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${VELVET.border}`, minHeight: '480px' }}>
            <div ref={canvasRef} className="w-full h-full" style={{ minHeight: '480px' }} />

            {/* Table count indicator */}
            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(12,11,16,0.85)', color: selectedTableIds.size > 0 ? VELVET.gold : VELVET.muted, border: `1px solid ${VELVET.border}` }}>
              {selectedTableIds.size} table{selectedTableIds.size !== 1 ? 's' : ''} selected
            </div>

            {/* Legend */}
            <div className="absolute bottom-3 left-3 flex flex-col gap-1.5">
              {[
                { color: VELVET.gold, label: 'Selected' },
                { color: '#333344', label: 'Unassigned' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs"
                  style={{ background: 'rgba(12,11,16,0.85)', color: VELVET.muted }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
              {zones.map(z => (
                <div key={z._id} className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs"
                  style={{ background: 'rgba(12,11,16,0.85)', color: VELVET.muted }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: z.color }} />
                  {z.name}
                </div>
              ))}
            </div>

            {floorplanObjects.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <RiMapPinLine style={{ fontSize: '40px', color: VELVET.muted }} />
                <p className="mt-3 text-sm" style={{ color: VELVET.muted }}>No tables found in this floorplan</p>
                <p className="text-xs mt-1" style={{ color: VELVET.border }}>Add tables in the Floorplan editor first</p>
              </div>
            )}
          </div>

          {/* Zone form panel */}
          <div className="w-80 flex-shrink-0 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: VELVET.muted }}>Zone Name *</label>
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. VIP Section"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: VELVET.surface, border: `1px solid ${VELVET.border}`, color: VELVET.cream }}
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: VELVET.muted }}>Zone Type</label>
              <div className="grid grid-cols-2 gap-1.5">
                {ZONE_TYPES.map(zt => (
                  <button
                    key={zt.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, type: zt.value, color: zt.color }))}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-left transition-all"
                    style={{
                      background: form.type === zt.value ? `${zt.color}22` : VELVET.surface,
                      border: `1px solid ${form.type === zt.value ? zt.color : VELVET.border}`,
                      color: form.type === zt.value ? zt.color : VELVET.muted
                    }}
                  >
                    {zt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: VELVET.muted }}>Color</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, color: c }))}
                    className="w-7 h-7 rounded-full transition-all"
                    style={{
                      background: c,
                      border: form.color === c ? `3px solid ${VELVET.cream}` : '2px solid transparent',
                      transform: form.color === c ? 'scale(1.2)' : 'scale(1)'
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                  className="w-7 h-7 rounded-full cursor-pointer"
                  style={{ border: `2px solid ${VELVET.border}`, padding: 0 }}
                  title="Custom color"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="p-4 rounded-xl space-y-3" style={{ background: VELVET.surface, border: `1px solid ${VELVET.border}` }}>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: VELVET.muted }}>Zone Pricing</p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs mb-1" style={{ color: VELVET.muted }}>Base Price (฿)</label>
                  <input type="number" min="0" value={form.basePrice}
                    onChange={e => setForm(p => ({ ...p, basePrice: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: VELVET.black, border: `1px solid ${VELVET.border}`, color: VELVET.cream }} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: VELVET.muted }}>Min Spend (฿)</label>
                  <input type="number" min="0" value={form.minimumSpend}
                    onChange={e => setForm(p => ({ ...p, minimumSpend: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: VELVET.black, border: `1px solid ${VELVET.border}`, color: VELVET.cream }} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: VELVET.muted }}>Peak Multiplier</label>
                  <input type="number" step="0.1" min="0.1" value={form.peakMultiplier}
                    onChange={e => setForm(p => ({ ...p, peakMultiplier: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: VELVET.black, border: `1px solid ${VELVET.border}`, color: VELVET.cream }} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: VELVET.muted }}>Event Multiplier</label>
                  <input type="number" step="0.1" min="0.1" value={form.eventMultiplier}
                    onChange={e => setForm(p => ({ ...p, eventMultiplier: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: VELVET.black, border: `1px solid ${VELVET.border}`, color: VELVET.cream }} />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setForm(p => ({ ...p, depositRequired: !p.depositRequired }))}
                  className="w-10 h-6 rounded-full transition-all relative flex-shrink-0"
                  style={{ background: form.depositRequired ? VELVET.gold : VELVET.border }}
                >
                  <div className="w-4 h-4 bg-white rounded-full absolute top-1 transition-all"
                    style={{ left: form.depositRequired ? '22px' : '4px' }} />
                </div>
                <span className="text-sm" style={{ color: VELVET.muted }}>Require deposit</span>
              </label>

              {form.depositRequired && (
                <div>
                  <label className="block text-xs mb-1" style={{ color: VELVET.muted }}>Deposit Amount (฿)</label>
                  <input type="number" min="0" value={form.depositAmount}
                    onChange={e => setForm(p => ({ ...p, depositAmount: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: VELVET.black, border: `1px solid ${VELVET.border}`, color: VELVET.cream }} />
                </div>
              )}
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{ background: VELVET.gold, color: '#0C0B10' }}
            >
              <RiCheckLine size={18} />
              {editingZone ? 'Update Zone' : 'Save Zone'}
            </button>
          </div>
        </div>
      )}

      {/* List mode */}
      {mode === 'list' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 rounded-full animate-spin"
                style={{ borderColor: VELVET.gold, borderTopColor: 'transparent' }} />
            </div>
          ) : zones.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ background: VELVET.surface, border: `1px solid ${VELVET.border}` }}>
              <RiMapPinLine style={{ fontSize: '48px', color: VELVET.muted, margin: '0 auto 12px' }} />
              <p style={{ color: VELVET.cream }}>No zones yet</p>
              <p className="text-sm mt-1" style={{ color: VELVET.muted }}>Create zones to set area-specific pricing</p>
              <button onClick={startCreate}
                className="mt-4 px-6 py-2.5 rounded-xl font-semibold text-sm"
                style={{ background: VELVET.gold, color: '#0C0B10' }}>
                Create Zone
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {zones.map(zone => (
                <motion.div
                  key={zone._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl"
                  style={{ background: VELVET.surface, border: `1px solid ${VELVET.border}` }}
                >
                  <div className="flex items-center gap-4">
                    {/* Color swatch */}
                    <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-lg"
                      style={{ background: `${zone.color}22`, border: `2px solid ${zone.color}` }}>
                      <div className="w-4 h-4 rounded-full" style={{ background: zone.color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold" style={{ color: VELVET.cream }}>{zone.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: `${zone.color}22`, color: zone.color }}>
                          {zone.type?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <span className="text-sm" style={{ color: VELVET.muted }}>
                          {zone.tableIds?.length || 0} table{(zone.tableIds?.length || 0) !== 1 ? 's' : ''}
                        </span>
                        {zone.pricing?.basePrice > 0 && (
                          <span className="text-sm" style={{ color: VELVET.muted }}>
                            Base: ฿{zone.pricing.basePrice}
                          </span>
                        )}
                        {zone.pricing?.minimumSpend > 0 && (
                          <span className="text-sm" style={{ color: VELVET.gold }}>
                            Min spend: ฿{zone.pricing.minimumSpend}
                          </span>
                        )}
                        {zone.pricing?.peakMultiplier > 1 && (
                          <span className="text-sm" style={{ color: VELVET.muted }}>
                            ×{zone.pricing.peakMultiplier} peak
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEditZone(zone)}
                        className="p-2 rounded-xl transition-opacity hover:opacity-60"
                        style={{ background: 'rgba(201,168,76,0.1)', color: VELVET.gold }}>
                        <RiEditLine size={16} />
                      </button>
                      <button onClick={() => handleDeleteZone(zone._id)}
                        className="p-2 rounded-xl transition-opacity hover:opacity-60"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                        <RiDeleteBinLine size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
