'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { createScene, createFloor } from '@/scripts/floor';
import {
  chair, table, roundTable, sofa,
  create2SeaterTable, create8SeaterTable,
  plant01, plant02, largeFridge, foodStand, drinkStand, iceBox, iceCreamBox,
} from '@/scripts/asset';

// placeholder box dimensions by object type
function placeholderDims(ud = {}) {
  if (ud.isChair) return [0.7, 1.0, 0.7];
  if (ud.isSofa)  return [1.6, 1.0, 0.8];
  if (ud.isTable) {
    if (ud.isRoundTable)       return [1.1, 0.8, 1.1];
    if (ud.maxCapacity === 2)  return [0.9, 0.8, 0.9];
    if (ud.maxCapacity === 8)  return [1.6, 0.8, 1.6];
    return [1.2, 0.8, 1.2];
  }
  if (ud.isPlant)      return [0.6, 1.2, 0.6];
  if (ud.isFridge)     return [1.2, 2.0, 0.7];
  if (ud.isFoodStand)  return [1.2, 0.9, 0.7];
  if (ud.isDrinkStand) return [0.9, 0.9, 0.6];
  if (ud.isIceBox)     return [1.0, 0.9, 0.7];
  if (ud.isIceCreamBox)return [1.5, 1.1, 0.9];
  return [1.0, 1.0, 1.0];
}

function loadModel(objData, scene) {
  const ud = objData.userData || {};
  if (ud.isChair)        return chair(scene);
  if (ud.isSofa)         return sofa(scene);
  if (ud.isPlant01)      return plant01(scene);
  if (ud.isPlant02)      return plant02(scene);
  if (ud.isTable) {
    if (ud.isRoundTable)       return roundTable(scene);
    if (ud.maxCapacity === 2)  return create2SeaterTable(scene);
    if (ud.maxCapacity === 8)  return create8SeaterTable(scene);
    return table(scene);
  }
  if (ud.isFridge)      return largeFridge(scene);
  if (ud.isFoodStand)   return foodStand(scene);
  if (ud.isDrinkStand)  return drinkStand(scene);
  if (ud.isIceBox)      return iceBox(scene);
  if (ud.isIceCreamBox) return iceCreamBox(scene);
  return Promise.resolve(null);
}

const GOLD  = 0xC9A84C;
const GREEN = 0x4a8c5c;
const GREY  = 0x8a8a8a;

export default function TableLabelManager({ restaurantId, token, floorplans = [] }) {
  const [selectedFloorplanId, setSelectedFloorplanId] = useState('');
  const [selectedTable, setSelectedTable]   = useState(null); // { objectId, userData }
  const [customName, setCustomName]         = useState('');
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState(null);

  const containerRef   = useRef(null);
  const sceneRef       = useRef(null);
  const rendererRef    = useRef(null);
  const cameraRef      = useRef(null);
  const controlsRef    = useRef(null);
  const animFrameRef   = useRef(null);
  const tableMapRef    = useRef({});   // objectId → THREE.Group (current representative)
  const selHelperRef   = useRef(null); // BoxHelper for selection
  const labelsRef      = useRef([]);   // { el, group } DOM label entries
  const fpDataRef      = useRef(null); // latest floorplan data for labels

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── Cleanup Three.js ────────────────────────────────────────────────────
  const cleanupScene = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    labelsRef.current.forEach(({ el }) => el.parentNode?.removeChild(el));
    labelsRef.current = [];

    if (rendererRef.current) {
      const { _onClick, _onMouseMove, _onResize } = rendererRef.current;
      if (_onClick)     rendererRef.current.domElement?.removeEventListener('click', _onClick);
      if (_onMouseMove) rendererRef.current.domElement?.removeEventListener('mousemove', _onMouseMove);
      if (_onResize)    window.removeEventListener('resize', _onResize);
      rendererRef.current.domElement?.parentNode?.removeChild(rendererRef.current.domElement);
      rendererRef.current.dispose();
    }
    if (sceneRef.current) {
      sceneRef.current.traverse(obj => {
        obj.geometry?.dispose();
        if (obj.material) {
          (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m.dispose());
        }
      });
    }
    sceneRef.current    = null;
    rendererRef.current = null;
    cameraRef.current   = null;
    controlsRef.current = null;
    tableMapRef.current = {};
    selHelperRef.current = null;
    setSelectedTable(null);
    setCustomName('');
  }, []);

  // ─── Selection helper (BoxHelper outline) ────────────────────────────────
  const applySelection = useCallback((group) => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (selHelperRef.current) scene.remove(selHelperRef.current);
    if (!group) { selHelperRef.current = null; return; }
    const helper = new THREE.BoxHelper(group, GOLD);
    scene.add(helper);
    selHelperRef.current = helper;
  }, []);

  // ─── Create / update DOM label for a table ───────────────────────────────
  const createLabel = useCallback((group, objectId, displayName, isSelected) => {
    const container = containerRef.current;
    if (!container) return null;
    const el = document.createElement('div');
    el.style.cssText = [
      'position:absolute',
      'pointer-events:none',
      'transform:translate(-50%,-50%)',
      'z-index:10',
      'padding:3px 8px',
      'border-radius:6px',
      'font-size:12px',
      'font-weight:700',
      'white-space:nowrap',
      'user-select:none',
      `background:${isSelected ? 'rgba(201,168,76,0.9)' : 'rgba(0,0,0,0.65)'}`,
      `color:${isSelected ? '#0C0B10' : '#F5F0E8'}`,
      `border:1px solid ${isSelected ? 'rgba(201,168,76,1)' : 'rgba(255,255,255,0.15)'}`,
    ].join(';');
    el.textContent = displayName;
    el.dataset.tableId = objectId;
    container.appendChild(el);
    return { el, group, objectId };
  }, []);

  const refreshLabels = useCallback(() => {
    // Remove all existing labels and recreate from current tableMapRef
    labelsRef.current.forEach(({ el }) => el.parentNode?.removeChild(el));
    labelsRef.current = [];

    const fp = fpDataRef.current;
    if (!fp) return;
    const objects = fp.data?.objects || fp.objects || [];
    const tables = objects.filter(o => o.userData?.isTable);

    setSelectedTable(prev => {
      tables.forEach(objData => {
        const group = tableMapRef.current[objData.objectId];
        if (!group) return;
        const isSelected = prev?.objectId === objData.objectId;
        const displayName = objData.userData?.customName || objData.objectId;
        const entry = createLabel(group, objData.objectId, displayName, isSelected);
        if (entry) labelsRef.current.push(entry);
      });
      return prev;
    });
  }, [createLabel]);

  // ─── Update DOM label positions each frame ────────────────────────────────
  const updateLabelPositions = useCallback(() => {
    const camera    = cameraRef.current;
    const container = containerRef.current;
    if (!camera || !container) return;

    for (const { el, group } of labelsRef.current) {
      const pos = new THREE.Vector3();
      group.getWorldPosition(pos);
      pos.y += 1.2; // float label above table
      const ndc = pos.clone().project(camera);
      if (ndc.z > 1) { el.style.display = 'none'; continue; }
      const x = (ndc.x * 0.5 + 0.5) * container.clientWidth;
      const y = (ndc.y * -0.5 + 0.5) * container.clientHeight;
      el.style.left    = x + 'px';
      el.style.top     = y + 'px';
      el.style.display = 'block';
    }
  }, []);

  // ─── Main scene initializer ───────────────────────────────────────────────
  const initScene = useCallback(async (fpData) => {
    const container = containerRef.current;
    if (!container || !fpData) return;

    fpDataRef.current = fpData;
    const objects = fpData.data?.objects || fpData.objects || [];

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = createScene();
    sceneRef.current = scene;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(10, 15, 10);
    dir.castShadow = true;
    scene.add(dir);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x080820, 0.5));

    // Camera
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 14, 14);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 3;
    controls.maxDistance = 50;
    controlsRef.current = controls;

    // Floor
    scene.add(createFloor(24, 24));

    // Separate object types
    const walls      = objects.filter(o => o.type === 'wall');
    const furniture  = objects.filter(o => !['wall', 'door', 'window'].includes(o.type));

    // Walls
    for (const od of walls) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 0.2),
        new THREE.MeshPhongMaterial({ color: 0x808080 })
      );
      mesh.position.fromArray(od.position);
      mesh.rotation.set(od.rotation.x, od.rotation.y, od.rotation.z);
      mesh.scale.fromArray(od.scale);
      mesh.userData = { ...od.userData };
      scene.add(mesh);
    }

    // Furniture placeholders (appear immediately)
    const placeholderMap = new Map(); // objectId → placeholder Group

    for (const od of furniture) {
      const ud = od.userData || {};
      const [w, h, d] = placeholderDims(ud);
      const geom = new THREE.BoxGeometry(w, h, d);
      geom.translate(0, h / 2, 0);
      const mat = new THREE.MeshPhongMaterial({
        color: ud.isTable ? GREEN : GREY,
        transparent: true,
        opacity: ud.isTable ? 0.85 : 0.4,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.receiveShadow = true;

      const group = new THREE.Group();
      group.add(mesh);
      group.position.fromArray(od.position);
      group.rotation.set(od.rotation.x, od.rotation.y, od.rotation.z);
      group.scale.fromArray(od.scale);
      group.userData = { ...ud, objectId: od.objectId };

      scene.add(group);
      placeholderMap.set(od.objectId, group);

      if (ud.isTable) {
        tableMapRef.current[od.objectId] = group;
      }
    }

    setLoading(false);

    // DOM labels
    refreshLabels();

    // Load real models in background
    Promise.allSettled(
      furniture.map(async (od) => {
        try {
          const model = await loadModel(od, scene);
          if (!model || !sceneRef.current) return;

          model.position.fromArray(od.position);
          model.rotation.set(od.rotation.x, od.rotation.y, od.rotation.z);
          model.scale.fromArray(od.scale);
          model.userData = { ...model.userData, ...od.userData, objectId: od.objectId };

          // Remove placeholder
          const placeholder = placeholderMap.get(od.objectId);
          if (placeholder) {
            scene.remove(placeholder);
            placeholder.traverse(o => {
              o.geometry?.dispose();
              (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m?.dispose());
            });
            placeholderMap.delete(od.objectId);
          }

          scene.add(model);

          // Update tableMap so raycasting and labels use the real model
          if (od.userData?.isTable) {
            tableMapRef.current[od.objectId] = model;
            // If this table was selected, re-apply the highlight
            setSelectedTable(prev => {
              if (prev?.objectId === od.objectId) applySelection(model);
              return prev;
            });
            refreshLabels();
          }
        } catch (_) {}
      })
    );

    // ─── Raycasting ──────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();

    const pickTable = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(scene.children, true);

      for (const hit of hits) {
        let obj = hit.object;
        while (obj) {
          if (obj.userData?.isTable) {
            return obj;
          }
          obj = obj.parent;
        }
      }
      return null;
    };

    const onClick = (e) => {
      const hit = pickTable(e);
      if (!hit) {
        // Click on empty space → deselect
        applySelection(null);
        setSelectedTable(null);
        setCustomName('');
        // Update label styles
        labelsRef.current.forEach(({ el, objectId }) => {
          el.style.background = 'rgba(0,0,0,0.65)';
          el.style.color      = '#F5F0E8';
          el.style.border     = '1px solid rgba(255,255,255,0.15)';
        });
        return;
      }

      const tableId = hit.userData.objectId || hit.userData.friendlyId;
      const group   = tableMapRef.current[tableId] || hit;

      applySelection(group);
      setSelectedTable({ objectId: tableId, userData: hit.userData });
      setCustomName(hit.userData.customName || '');

      // Update label highlight
      labelsRef.current.forEach(({ el, objectId }) => {
        const sel = objectId === tableId;
        el.style.background = sel ? 'rgba(201,168,76,0.9)' : 'rgba(0,0,0,0.65)';
        el.style.color      = sel ? '#0C0B10' : '#F5F0E8';
        el.style.border     = `1px solid ${sel ? 'rgba(201,168,76,1)' : 'rgba(255,255,255,0.15)'}`;
      });
    };

    const onMouseMove = (e) => {
      renderer.domElement.style.cursor = pickTable(e) ? 'pointer' : 'default';
    };

    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer._onClick     = onClick;
    renderer._onMouseMove = onMouseMove;

    // ─── Resize ──────────────────────────────────────────────────────────────
    const onResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);
    renderer._onResize = onResize;

    // ─── Animation loop ───────────────────────────────────────────────────────
    let frame = 0;
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      if (selHelperRef.current) selHelperRef.current.update();
      renderer.render(scene, camera);
      if (++frame % 2 === 0) updateLabelPositions();
    };
    animate();
  }, [applySelection, createLabel, refreshLabels, updateLabelPositions]);

  // ─── Load floorplan when selection changes ────────────────────────────────
  useEffect(() => {
    if (!selectedFloorplanId || !token) return;

    cleanupScene();
    setLoading(true);

    let cancelled = false;

    (async () => {
      let fpData = floorplans.find(f => f._id === selectedFloorplanId);
      if (!fpData?.data) {
        try {
          const res = await fetch(
            `/api/restaurants/${restaurantId}/floorplans/${selectedFloorplanId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          fpData = await res.json();
        } catch {
          if (!cancelled) showToast('Failed to load floorplan', 'error');
          setLoading(false);
          return;
        }
      }
      if (!cancelled) await initScene(fpData);
    })();

    return () => {
      cancelled = true;
      cleanupScene();
    };
  }, [selectedFloorplanId, token]);

  // ─── Save handler ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedTable || !selectedFloorplanId) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/floorplans/${selectedFloorplanId}/table-labels`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ objectId: selectedTable.objectId, customName }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      const trimmed = customName.trim();

      // Update userData in tableMapRef so labels stay correct
      const group = tableMapRef.current[selectedTable.objectId];
      if (group) group.userData.customName = trimmed || undefined;

      // Update fpDataRef objects so refreshLabels reads the new name
      if (fpDataRef.current) {
        const objs = fpDataRef.current.data?.objects || fpDataRef.current.objects || [];
        const obj = objs.find(o => o.objectId === selectedTable.objectId);
        if (obj) {
          if (trimmed) obj.userData.customName = trimmed;
          else delete obj.userData.customName;
        }
      }

      // Update the selectedTable userData
      setSelectedTable(prev => prev
        ? { ...prev, userData: { ...prev.userData, customName: trimmed || undefined } }
        : prev
      );

      // Update DOM label text + highlight
      labelsRef.current.forEach(({ el, objectId }) => {
        if (objectId === selectedTable.objectId) {
          el.textContent = trimmed || selectedTable.objectId;
        }
      });

      // Invalidate floorplan cache
      try {
        localStorage.removeItem(`floorplan_${selectedFloorplanId}`);
        localStorage.removeItem(`floorplan_${selectedFloorplanId}_ts`);
      } catch (_) {}

      showToast(trimmed ? `Saved: "${trimmed}"` : 'Label cleared');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ color: '#F5F0E8', minHeight: '500px' }}>
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl"
          style={{ background: toast.type === 'error' ? '#ef4444' : '#22c55e', color: '#fff', maxWidth: '340px' }}
        >
          {toast.msg}
        </div>
      )}

      {/* Floorplan selector */}
      <div className="mb-4">
        <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#9B96A8' }}>
          Select Floorplan
        </label>
        <select
          value={selectedFloorplanId}
          onChange={e => setSelectedFloorplanId(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm font-medium outline-none"
          style={{ background: '#1E1D2A', border: '1px solid #2E2D3A', color: '#F5F0E8', minWidth: '220px' }}
        >
          <option value="">— choose a floorplan —</option>
          {floorplans.map(fp => (
            <option key={fp._id} value={fp._id}>{fp.name}</option>
          ))}
        </select>
      </div>

      {!selectedFloorplanId && (
        <div className="text-center py-16" style={{ color: '#9B96A8' }}>
          Select a floorplan above to start labelling tables.
        </div>
      )}

      {selectedFloorplanId && (
        <div className="flex gap-4" style={{ minHeight: '520px' }}>
          {/* 3D Canvas */}
          <div className="flex-1 relative rounded-2xl overflow-hidden"
            style={{ background: '#f0efec', minHeight: '520px', border: '1px solid #2E2D3A' }}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10"
                style={{ background: 'rgba(12,11,16,0.6)', backdropFilter: 'blur(4px)' }}>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: '#C9A84C', borderTopColor: 'transparent' }} />
                  <p className="text-sm font-medium" style={{ color: '#F5F0E8' }}>Loading floorplan…</p>
                </div>
              </div>
            )}
            <div ref={containerRef} className="absolute inset-0" />

            {/* Hint overlay when no table selected */}
            {!loading && !selectedTable && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-xs font-semibold pointer-events-none"
                style={{ background: 'rgba(12,11,16,0.75)', color: '#9B96A8', backdropFilter: 'blur(6px)', whiteSpace: 'nowrap' }}>
                Click a table to select it
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="flex-shrink-0" style={{ width: '260px' }}>
            {!selectedTable ? (
              <div className="flex flex-col items-center justify-center rounded-2xl h-full text-center px-4"
                style={{ border: '2px dashed #2E2D3A', color: '#9B96A8', minHeight: '200px' }}>
                <span style={{ fontSize: '28px', marginBottom: '10px' }}>🏷️</span>
                <p className="text-sm font-medium">Click any table<br />in the floorplan</p>
                <p className="text-xs mt-2" style={{ color: '#555' }}>
                  Gold ring = selected
                </p>
              </div>
            ) : (
              <div className="rounded-2xl p-5 space-y-4" style={{ background: '#161520', border: '1px solid #1E1D2A', height: '100%' }}>
                {/* Table header */}
                <div className="pb-4" style={{ borderBottom: '1px solid #1E1D2A' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#9B96A8' }}>
                    Selected Table
                  </p>
                  <p className="font-black text-lg" style={{ color: '#C9A84C' }}>
                    {selectedTable.userData?.customName || selectedTable.objectId}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#9B96A8' }}>
                    ID: {selectedTable.objectId}
                    {selectedTable.userData?.maxCapacity ? ` · ${selectedTable.userData.maxCapacity} seats` : ''}
                  </p>
                </div>

                {/* Name input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#9B96A8' }}>
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    placeholder="e.g. VIP Table, Window Seat…"
                    maxLength={40}
                    autoFocus
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: '#0C0B10', border: '1px solid #2E2D3A', color: '#F5F0E8' }}
                  />
                  <p className="text-xs mt-2 leading-snug" style={{ color: '#555' }}>
                    Shown to customers during booking. Leave blank to use the system ID.
                  </p>
                </div>

                {/* Save */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: '#C9A84C',
                    color: '#0C0B10',
                    opacity: saving ? 0.7 : 1,
                    cursor: saving ? 'wait' : 'pointer',
                  }}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 rounded-full animate-spin"
                        style={{ borderColor: 'rgba(12,11,16,0.3)', borderTopColor: '#0C0B10' }} />
                      Saving…
                    </>
                  ) : customName.trim() ? 'Save Label' : 'Clear Label'}
                </button>

                <button
                  onClick={() => {
                    applySelection(null);
                    setSelectedTable(null);
                    setCustomName('');
                    labelsRef.current.forEach(({ el }) => {
                      el.style.background = 'rgba(0,0,0,0.65)';
                      el.style.color      = '#F5F0E8';
                      el.style.border     = '1px solid rgba(255,255,255,0.15)';
                    });
                  }}
                  className="w-full py-2 rounded-xl text-xs font-medium transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#9B96A8', border: '1px solid #2E2D3A' }}
                >
                  Deselect
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
