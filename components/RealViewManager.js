'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import QRCode from 'qrcode';
import { createScene, createFloor } from '@/scripts/floor';
import {
  chair, table, roundTable, sofa,
  create2SeaterTable, create8SeaterTable,
  plant01, plant02, largeFridge, foodStand, drinkStand, iceBox, iceCreamBox,
} from '@/scripts/asset';

const VELVET360_URL = process.env.NEXT_PUBLIC_VELVET360_URL || 'https://velvet360-production.up.railway.app';
const STAGE_LABELS = {
  starting:  'Starting stitcher…',
  loading:   'Loading photos…',
  matching:  'Matching features…',
  optimizing:'Optimizing geometry…',
  stitching: 'Stitching panorama…',
  saving:    'Saving result…',
  done:      'Done',
  error:     'Stitch failed',
  unknown:   'Waiting for phone…',
};

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
  if (ud.isChair)       return chair(scene);
  if (ud.isSofa)        return sofa(scene);
  if (ud.isPlant01)     return plant01(scene);
  if (ud.isPlant02)     return plant02(scene);
  if (ud.isTable) {
    if (ud.isRoundTable)      return roundTable(scene);
    if (ud.maxCapacity === 2) return create2SeaterTable(scene);
    if (ud.maxCapacity === 8) return create8SeaterTable(scene);
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

export default function RealViewManager({ restaurantId, token, floorplans = [] }) {
  const [selectedFloorplanId, setSelectedFloorplanId] = useState('');
  const [selectedTable, setSelectedTable] = useState(null); // { objectId, userData }
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [heading, setHeading]     = useState(0);
  const [previewUrl, setPreviewUrl] = useState('');
  const [toast, setToast]         = useState(null);

  // Phone capture modal state
  const [phoneModalOpen, setPhoneModalOpen]   = useState(false);
  const [phoneSessionId, setPhoneSessionId]   = useState('');
  const [phoneQrDataUrl, setPhoneQrDataUrl]   = useState('');
  const [phoneStage, setPhoneStage]           = useState('unknown');
  const [phoneError, setPhoneError]           = useState('');
  const [phoneFinalizing, setPhoneFinalizing] = useState(false);
  const phonePollRef = useRef(null);

  const fileInputRef   = useRef(null);
  const containerRef   = useRef(null);
  const sceneRef       = useRef(null);
  const rendererRef    = useRef(null);
  const cameraRef      = useRef(null);
  const controlsRef    = useRef(null);
  const animFrameRef   = useRef(null);
  const tableMapRef    = useRef({});
  const selHelperRef   = useRef(null);
  const labelsRef      = useRef([]);
  const fpDataRef      = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  const cleanupScene = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    labelsRef.current.forEach(({ el }) => el.parentNode?.removeChild(el));
    labelsRef.current = [];

    if (rendererRef.current) {
      const r = rendererRef.current;
      r.domElement?.removeEventListener('click', r._onClick);
      r.domElement?.removeEventListener('mousemove', r._onMouseMove);
      window.removeEventListener('resize', r._onResize);
      r.domElement?.parentNode?.removeChild(r.domElement);
      r.dispose();
    }
    if (sceneRef.current) {
      sceneRef.current.traverse(obj => {
        obj.geometry?.dispose();
        (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m?.dispose());
      });
    }
    sceneRef.current    = null;
    rendererRef.current = null;
    cameraRef.current   = null;
    controlsRef.current = null;
    tableMapRef.current = {};
    selHelperRef.current = null;
    setSelectedTable(null);
    setPreviewUrl('');
    setHeading(0);
  }, []);

  // ─── Selection BoxHelper ──────────────────────────────────────────────────
  const applySelection = useCallback((group) => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (selHelperRef.current) scene.remove(selHelperRef.current);
    selHelperRef.current = null;
    if (!group) return;
    const helper = new THREE.BoxHelper(group, GOLD);
    scene.add(helper);
    selHelperRef.current = helper;
  }, []);

  // ─── Build a DOM label for one table ─────────────────────────────────────
  const buildLabel = useCallback((group, objectId, displayName, has360, isSelected) => {
    const container = containerRef.current;
    if (!container) return null;

    const el = document.createElement('div');
    el.style.cssText = [
      'position:absolute',
      'pointer-events:none',
      'transform:translate(-50%,-100%)',
      'z-index:10',
      'display:flex',
      'align-items:center',
      'gap:4px',
      'padding:3px 8px',
      'border-radius:6px',
      'font-size:11px',
      'font-weight:700',
      'white-space:nowrap',
      'user-select:none',
    ].join(';');

    const setStyle = (sel, h360) => {
      el.style.background = sel ? 'rgba(201, 169, 97, 0.92)' : 'rgba(10, 9, 8, 0.8)';
      el.style.color      = sel ? '#0a0908' : (h360 ? '#22c55e' : '#8b847a');
      el.style.border     = `1px solid ${sel ? 'rgba(201, 169, 97, 1)' : h360 ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`;
    };
    setStyle(isSelected, has360);

    if (has360) {
      const dot = document.createElement('span');
      dot.textContent = '●';
      dot.style.cssText = `font-size:7px;color:${isSelected ? '#0a0908' : '#22c55e'}`;
      dot.dataset.dot = '1';
      el.appendChild(dot);
    }
    const text = document.createElement('span');
    text.textContent = displayName;
    el.appendChild(text);

    el.dataset.tableId = objectId;
    el._setStyle = setStyle;
    container.appendChild(el);
    return { el, group, objectId };
  }, []);

  // ─── Recreate all labels from fpDataRef ───────────────────────────────────
  const refreshLabels = useCallback(() => {
    labelsRef.current.forEach(({ el }) => el.parentNode?.removeChild(el));
    labelsRef.current = [];
    const fp = fpDataRef.current;
    if (!fp) return;
    const objects = fp.data?.objects || fp.objects || [];

    setSelectedTable(prev => {
      objects.filter(o => o.userData?.isTable).forEach(od => {
        const group = tableMapRef.current[od.objectId];
        if (!group) return;
        const isSelected = prev?.objectId === od.objectId;
        const has360     = !!od.userData?.realView?.photoUrl;
        const name       = od.userData?.customName || od.objectId;
        const entry = buildLabel(group, od.objectId, name, has360, isSelected);
        if (entry) labelsRef.current.push(entry);
      });
      return prev;
    });
  }, [buildLabel]);

  // ─── Update label positions each frame ────────────────────────────────────
  const updateLabelPositions = useCallback(() => {
    const camera    = cameraRef.current;
    const container = containerRef.current;
    if (!camera || !container) return;

    for (const { el, group } of labelsRef.current) {
      const pos = new THREE.Vector3();
      group.getWorldPosition(pos);
      pos.y += 1.4;
      const ndc = pos.clone().project(camera);
      if (ndc.z > 1) { el.style.display = 'none'; continue; }
      el.style.left    = ((ndc.x * 0.5 + 0.5) * container.clientWidth) + 'px';
      el.style.top     = ((ndc.y * -0.5 + 0.5) * container.clientHeight) + 'px';
      el.style.display = 'flex';
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

    // Scene / lighting / camera
    const scene = createScene();
    sceneRef.current = scene;
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(10, 15, 10);
    dir.castShadow = true;
    scene.add(dir);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x080820, 0.5));

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 14, 14);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 3;
    controls.maxDistance = 50;
    controlsRef.current = controls;

    scene.add(createFloor(24, 24));

    // Walls
    objects.filter(o => o.type === 'wall').forEach(od => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 0.2),
        new THREE.MeshPhongMaterial({ color: 0x808080 })
      );
      mesh.position.fromArray(od.position);
      mesh.rotation.set(od.rotation.x, od.rotation.y, od.rotation.z);
      mesh.scale.fromArray(od.scale);
      mesh.userData = { ...od.userData };
      scene.add(mesh);
    });

    // Furniture placeholders
    const furniture = objects.filter(o => !['wall', 'door', 'window'].includes(o.type));
    const placeholderMap = new Map();

    furniture.forEach(od => {
      const ud = od.userData || {};
      const [w, h, d] = placeholderDims(ud);
      const geom = new THREE.BoxGeometry(w, h, d);
      geom.translate(0, h / 2, 0);
      const mat = new THREE.MeshPhongMaterial({
        color: ud.isTable ? GREEN : GREY,
        transparent: true,
        opacity: ud.isTable ? 0.85 : 0.4,
      });
      const group = new THREE.Group();
      group.add(new THREE.Mesh(geom, mat));
      group.position.fromArray(od.position);
      group.rotation.set(od.rotation.x, od.rotation.y, od.rotation.z);
      group.scale.fromArray(od.scale);
      group.userData = { ...ud, objectId: od.objectId };
      scene.add(group);
      placeholderMap.set(od.objectId, group);

      if (ud.isTable) {
        tableMapRef.current[od.objectId] = group;
      }
    });

    setLoading(false);
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

          const ph = placeholderMap.get(od.objectId);
          if (ph) {
            scene.remove(ph);
            ph.traverse(o => {
              o.geometry?.dispose();
              (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m?.dispose());
            });
            placeholderMap.delete(od.objectId);
          }
          scene.add(model);

          if (od.userData?.isTable) {
            tableMapRef.current[od.objectId] = model;
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
          if (obj.userData?.isTable) return obj;
          obj = obj.parent;
        }
      }
      return null;
    };

    const highlightLabels = (activeId) => {
      labelsRef.current.forEach(({ el, objectId }) => {
        const sel  = objectId === activeId;
        const fp2  = fpDataRef.current;
        const objs = fp2?.data?.objects || fp2?.objects || [];
        const od   = objs.find(o => o.objectId === objectId);
        const h360 = !!od?.userData?.realView?.photoUrl;
        el._setStyle?.(sel, h360);
        // update dot color
        const dot = el.querySelector('[data-dot]');
        if (dot) dot.style.color = sel ? '#0a0908' : '#22c55e';
      });
    };

    const onClick = (e) => {
      const hit = pickTable(e);
      if (!hit) {
        applySelection(null);
        setSelectedTable(null);
        setPreviewUrl('');
        setHeading(0);
        highlightLabels(null);
        return;
      }
      const tableId = hit.userData.objectId || hit.userData.friendlyId;
      const group   = tableMapRef.current[tableId] || hit;
      applySelection(group);

      // Read realView from fpDataRef (always current after saves)
      const fpObjs = fpDataRef.current?.data?.objects || fpDataRef.current?.objects || [];
      const latestObj = fpObjs.find(o => o.objectId === tableId);
      const ud = latestObj?.userData || hit.userData;

      setSelectedTable({ objectId: tableId, userData: ud });
      setPreviewUrl(ud.realView?.photoUrl || '');
      setHeading(ud.realView?.heading ?? 0);
      highlightLabels(tableId);
    };

    const onMouseMove = (e) => {
      renderer.domElement.style.cursor = pickTable(e) ? 'pointer' : 'default';
    };

    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer._onClick     = onClick;
    renderer._onMouseMove = onMouseMove;

    // Resize
    const onResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);
    renderer._onResize = onResize;

    // Animation loop
    let frame = 0;
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      selHelperRef.current?.update();
      renderer.render(scene, camera);
      if (++frame % 2 === 0) updateLabelPositions();
    };
    animate();
  }, [applySelection, buildLabel, refreshLabels, updateLabelPositions]);

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

    return () => { cancelled = true; cleanupScene(); };
  }, [selectedFloorplanId, token]);

  // ─── File upload handlers ─────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Please upload a JPEG, PNG, or WebP image', 'error'); return;
    }
    if (file.size > 25 * 1024 * 1024) {
      showToast('File must be under 25 MB', 'error'); return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      URL.revokeObjectURL(url);
      const ratio = img.width / img.height;
      if (ratio < 1.8 || ratio > 2.3) {
        showToast(`Ratio ${ratio.toFixed(2)}:1 — expected 2:1 equirectangular`, 'error'); return;
      }
      await doUpload(file);
    };
    img.src = url;
  };

  const doUpload = async (file) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', '360view');
      const res  = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setPreviewUrl(data.url);
      showToast('Photo uploaded — click Save to attach it to this table');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ─── Phone capture flow ───────────────────────────────────────────────────
  const stopPhonePolling = useCallback(() => {
    if (phonePollRef.current) {
      clearInterval(phonePollRef.current);
      phonePollRef.current = null;
    }
  }, []);

  const closePhoneModal = useCallback(() => {
    stopPhonePolling();
    setPhoneModalOpen(false);
    setPhoneSessionId('');
    setPhoneQrDataUrl('');
    setPhoneStage('unknown');
    setPhoneError('');
    setPhoneFinalizing(false);
  }, [stopPhonePolling]);

  const finalizePhoneCapture = useCallback(async (sessionId) => {
    setPhoneFinalizing(true);
    try {
      const res = await fetch('/api/realview/capture-finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Finalize failed');
      setPreviewUrl(data.url);
      showToast('Phone capture saved — click Save to attach it');
      closePhoneModal();
    } catch (err) {
      setPhoneError(err.message);
      setPhoneFinalizing(false);
    }
  }, [token, closePhoneModal]);

  const openPhoneCapture = useCallback(async () => {
    if (!selectedTable) return;
    // Random 12-char session id (matches server's _SAFE_ID regex)
    const sid = Array.from({ length: 12 }, () =>
      'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]
    ).join('');
    const captureUrl = `${VELVET360_URL}/static/capture.html?session=${sid}`;
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(captureUrl, { width: 280, margin: 1 });
    } catch (e) {
      showToast('Failed to generate QR', 'error');
      return;
    }

    setPhoneSessionId(sid);
    setPhoneQrDataUrl(qrDataUrl);
    setPhoneStage('unknown');
    setPhoneError('');
    setPhoneFinalizing(false);
    setPhoneModalOpen(true);

    // Poll Railway status; finalize when done
    stopPhonePolling();
    phonePollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${VELVET360_URL}/status/${sid}`);
        if (!r.ok) return;
        const d = await r.json();
        setPhoneStage(d.stage || 'unknown');
        if (d.stage === 'done') {
          stopPhonePolling();
          finalizePhoneCapture(sid);
        } else if (d.stage === 'error') {
          stopPhonePolling();
          setPhoneError(d.message || 'Stitch failed on phone');
        }
      } catch (_) { /* ignore polling errors, retry next tick */ }
    }, 2000);
  }, [selectedTable, stopPhonePolling, finalizePhoneCapture]);

  useEffect(() => () => stopPhonePolling(), [stopPhonePolling]);

  // ─── Save handler ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedTable || !selectedFloorplanId) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/restaurants/${restaurantId}/floorplans/${selectedFloorplanId}/realview`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            objectId: selectedTable.objectId,
            photoUrl: previewUrl || null,
            heading:  Number(heading),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      const newRV = previewUrl ? { photoUrl: previewUrl, heading: Number(heading) } : undefined;

      // Update fpDataRef so labels refresh with correct 360° indicator
      if (fpDataRef.current) {
        const objs = fpDataRef.current.data?.objects || fpDataRef.current.objects || [];
        const obj  = objs.find(o => o.objectId === selectedTable.objectId);
        if (obj) {
          if (previewUrl) obj.userData.realView = newRV;
          else delete obj.userData.realView;
        }
      }
      // Update tableMap userData too (for click re-reads)
      const group = tableMapRef.current[selectedTable.objectId];
      if (group) {
        if (previewUrl) group.userData.realView = newRV;
        else delete group.userData.realView;
      }

      setSelectedTable(prev =>
        prev ? { ...prev, userData: { ...prev.userData, realView: newRV } } : prev
      );

      // Refresh labels to show/remove the green 360° dot
      refreshLabels();
      // Keep selected table highlighted
      if (group) {
        labelsRef.current.forEach(({ el, objectId }) => {
          if (objectId === selectedTable.objectId) {
            el._setStyle?.(true, !!previewUrl);
            const dot = el.querySelector('[data-dot]');
            if (dot) dot.style.color = '#0a0908';
          }
        });
      }

      try {
        localStorage.removeItem(`floorplan_${selectedFloorplanId}`);
        localStorage.removeItem(`floorplan_${selectedFloorplanId}_ts`);
      } catch (_) {}

      showToast(previewUrl
        ? `360° photo saved for ${selectedTable.userData?.customName || selectedTable.objectId}`
        : '360° photo removed'
      );
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ color: '#f5efe3', minHeight: '500px' }}>
      {/* Phone capture modal */}
      {phoneModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(10, 9, 8, 0.85)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="rounded-2xl p-7 w-full max-w-md"
            style={{ background: '#15130f', border: '1px solid #2E2D3A' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black" style={{ color: '#f5efe3' }}>
                  Capture with Phone
                </h3>
                <p className="text-xs mt-0.5" style={{ color: '#8b847a' }}>
                  {selectedTable?.userData?.customName || selectedTable?.objectId}
                </p>
              </div>
              <button
                onClick={closePhoneModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#8b847a' }}
              >
                ✕
              </button>
            </div>

            {!phoneFinalizing && phoneStage !== 'done' && !phoneError && (
              <>
                <div
                  className="rounded-xl p-4 mb-4 flex items-center justify-center"
                  style={{ background: '#fff' }}
                >
                  {phoneQrDataUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={phoneQrDataUrl} alt="QR code" style={{ width: 240, height: 240 }} />
                  ) : (
                    <div style={{ width: 240, height: 240 }} />
                  )}
                </div>
                <ol className="text-sm space-y-1.5 mb-4" style={{ color: '#8b847a' }}>
                  <li>1. Scan with your phone camera</li>
                  <li>2. Aim at the floating rings — auto-snaps when aligned</li>
                  <li>3. Tap <span style={{ color: '#c9a961', fontWeight: 700 }}>Stitch</span> when you have ≥2 shots</li>
                </ol>
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                  style={{ background: 'rgba(201, 169, 97, 0.08)', border: '1px solid rgba(201, 169, 97, 0.2)', color: '#c9a961' }}
                >
                  <div
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: '#c9a961' }}
                  />
                  <span>{STAGE_LABELS[phoneStage] || 'Waiting…'}</span>
                </div>
                <p className="text-xs mt-3 font-mono break-all" style={{ color: '#555' }}>
                  Session: {phoneSessionId}
                </p>
              </>
            )}

            {phoneFinalizing && (
              <div className="py-12 flex flex-col items-center gap-3">
                <div
                  className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: '#c9a961', borderTopColor: 'transparent' }}
                />
                <p className="text-sm font-medium" style={{ color: '#f5efe3' }}>
                  Saving panorama to permanent storage…
                </p>
              </div>
            )}

            {phoneError && (
              <div
                className="rounded-lg p-3 text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
              >
                {phoneError}
                <button
                  onClick={closePhoneModal}
                  className="block mt-3 px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#f5efe3', border: '1px solid #2E2D3A' }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl"
          style={{ background: toast.type === 'error' ? '#ef4444' : '#22c55e', color: '#fff', maxWidth: '360px' }}>
          {toast.msg}
        </div>
      )}

      {/* Floorplan selector */}
      <div className="mb-4">
        <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#8b847a' }}>
          Select Floorplan
        </label>
        <select
          value={selectedFloorplanId}
          onChange={e => setSelectedFloorplanId(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm font-medium outline-none"
          style={{ background: '#2a241b', border: '1px solid #2E2D3A', color: '#f5efe3', minWidth: '220px' }}
        >
          <option value="">— choose a floorplan —</option>
          {floorplans.map(fp => (
            <option key={fp._id} value={fp._id}>{fp.name}</option>
          ))}
        </select>
      </div>

      {!selectedFloorplanId && (
        <div className="text-center py-16" style={{ color: '#8b847a' }}>
          Select a floorplan above to manage 360° photos for its tables.
        </div>
      )}

      {selectedFloorplanId && (
        <div className="flex gap-4" style={{ minHeight: '520px' }}>

          {/* 3D Canvas */}
          <div className="flex-1 relative rounded-2xl overflow-hidden"
            style={{ background: '#f0efec', minHeight: '520px', border: '1px solid #2E2D3A' }}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10"
                style={{ background: 'rgba(10, 9, 8, 0.6)', backdropFilter: 'blur(4px)' }}>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: '#c9a961', borderTopColor: 'transparent' }} />
                  <p className="text-sm font-medium" style={{ color: '#f5efe3' }}>Loading floorplan…</p>
                </div>
              </div>
            )}
            <div ref={containerRef} className="absolute inset-0" />

            {!loading && !selectedTable && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-xs font-semibold pointer-events-none"
                style={{ background: 'rgba(10, 9, 8, 0.75)', color: '#8b847a', backdropFilter: 'blur(6px)', whiteSpace: 'nowrap' }}>
                Click a table to manage its 360° photo
              </div>
            )}

            {/* Legend */}
            {!loading && (
              <div className="absolute top-3 left-3 flex items-center gap-3 px-3 py-1.5 rounded-xl pointer-events-none"
                style={{ background: 'rgba(10, 9, 8, 0.7)', backdropFilter: 'blur(6px)' }}>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: '#22c55e' }}>
                  <span style={{ fontSize: '7px' }}>●</span> Has 360°
                </span>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: '#8b847a' }}>
                  <span style={{ fontSize: '7px' }}>●</span> No photo
                </span>
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="flex-shrink-0" style={{ width: '280px' }}>
            {!selectedTable ? (
              <div className="flex flex-col items-center justify-center rounded-2xl h-full text-center px-4"
                style={{ border: '2px dashed #2E2D3A', color: '#8b847a', minHeight: '200px' }}>
                <span style={{ fontSize: '32px', marginBottom: '10px' }}>📷</span>
                <p className="text-sm font-medium">Click any table<br />in the floorplan</p>
                <p className="text-xs mt-2" style={{ color: '#555' }}>Gold ring = selected</p>
              </div>
            ) : (
              <div className="rounded-2xl p-5 space-y-4 overflow-y-auto"
                style={{ background: '#15130f', border: '1px solid #2a241b', maxHeight: '520px' }}>

                {/* Table header */}
                <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '1px solid #2a241b' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(201, 169, 97, 0.12)', border: '1px solid rgba(201, 169, 97, 0.25)' }}>
                    <span style={{ fontSize: '18px' }}>🔮</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-black truncate" style={{ color: '#c9a961' }}>
                      {selectedTable.userData?.customName || selectedTable.objectId}
                    </p>
                    <p className="text-xs" style={{ color: '#8b847a' }}>
                      {selectedTable.userData?.maxCapacity ? `${selectedTable.userData.maxCapacity} seats · ` : ''}
                      {selectedTable.userData?.realView?.photoUrl ? '360° attached' : 'No 360° yet'}
                    </p>
                  </div>
                </div>

                {/* Capture with phone */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#8b847a' }}>
                    Capture On-Site
                  </label>
                  <button
                    onClick={openPhoneCapture}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
                    style={{
                      background: 'rgba(201, 169, 97, 0.12)',
                      border: '1px solid rgba(201, 169, 97, 0.4)',
                      color: '#c9a961',
                    }}
                  >
                    📱 Capture with Phone
                  </button>
                  <p className="text-xs mt-1.5 leading-snug" style={{ color: '#555' }}>
                    Opens a guided capture flow on your phone. Stitches automatically when done.
                  </p>
                </div>

                {/* Photo upload zone */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#8b847a' }}>
                    Or Upload Existing 360° Photo
                  </label>

                  {previewUrl ? (
                    <div className="relative rounded-xl overflow-hidden" style={{ height: '160px', border: '1px solid #2E2D3A' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt="360 preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-end p-2 gap-2"
                        style={{ background: 'linear-gradient(to top, rgba(10, 9, 8, 0.9) 0%, transparent 60%)' }}>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#f5efe3' }}
                        >
                          Replace
                        </button>
                        <button
                          onClick={() => setPreviewUrl('')}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full flex flex-col items-center justify-center gap-2 rounded-xl transition-all"
                      style={{
                        height: '160px',
                        border: '2px dashed #2E2D3A',
                        background: 'rgba(255,255,255,0.02)',
                        color: '#8b847a',
                        cursor: uploading ? 'wait' : 'pointer',
                      }}
                    >
                      {uploading ? (
                        <>
                          <div className="w-6 h-6 border-2 rounded-full animate-spin"
                            style={{ borderColor: '#c9a961', borderTopColor: 'transparent' }} />
                          <span className="text-sm">Uploading…</span>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: '26px' }}>📷</span>
                          <span className="text-sm font-medium">Click to upload</span>
                          <span className="text-xs text-center leading-tight" style={{ color: '#555' }}>
                            2:1 equirectangular · JPEG/PNG/WebP · max 25 MB
                          </span>
                        </>
                      )}
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                {/* Heading slider */}
                <div>
                  <label className="flex items-center justify-between text-xs font-bold uppercase tracking-widest mb-2"
                    style={{ color: '#8b847a' }}>
                    <span>Camera Heading</span>
                    <span style={{ color: '#c9a961', fontFamily: 'monospace' }}>{heading}°</span>
                  </label>
                  <input
                    type="range" min={0} max={359}
                    value={heading}
                    onChange={e => setHeading(Number(e.target.value))}
                    className="w-full"
                    style={{ accentColor: '#c9a961' }}
                  />
                  <p className="text-xs mt-1 leading-snug" style={{ color: '#555' }}>
                    Rotate until the photo centre faces the restaurant entrance.
                    Capture with Google Street View app (saves equirectangular automatically).
                  </p>
                </div>

                {/* Save */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  style={{ background: '#c9a961', color: '#0a0908', opacity: saving ? 0.7 : 1, cursor: saving ? 'wait' : 'pointer' }}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 rounded-full animate-spin"
                        style={{ borderColor: 'rgba(10, 9, 8, 0.3)', borderTopColor: '#0a0908' }} />
                      Saving…
                    </>
                  ) : previewUrl ? 'Save 360° Photo' : 'Save (remove photo)'}
                </button>

                {/* Deselect */}
                <button
                  onClick={() => {
                    applySelection(null);
                    setSelectedTable(null);
                    setPreviewUrl('');
                    setHeading(0);
                    labelsRef.current.forEach(({ el, objectId }) => {
                      const fp2  = fpDataRef.current;
                      const objs = fp2?.data?.objects || fp2?.objects || [];
                      const od   = objs.find(o => o.objectId === objectId);
                      el._setStyle?.(false, !!od?.userData?.realView?.photoUrl);
                      const dot = el.querySelector('[data-dot]');
                      if (dot) dot.style.color = '#22c55e';
                    });
                  }}
                  className="w-full py-2 rounded-xl text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#8b847a', border: '1px solid #2E2D3A' }}
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
