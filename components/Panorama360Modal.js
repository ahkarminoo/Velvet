'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Top-down minimap shown in the corner of the panorama. Pure SVG, no Three.js.
 */
function PanoramaMinimap({ objects, currentTableId, availableTables }) {
  const tables = (objects || []).filter((obj) => obj.userData?.isTable);
  if (tables.length === 0) return null;

  const xs = tables.map((t) => t.position[0]);
  const zs = tables.map((t) => t.position[2]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const rangeX = maxX - minX || 1;
  const rangeZ = maxZ - minZ || 1;
  const size = 100;
  const pad = 10;

  const toSvg = (x, z) => ({
    sx: pad + ((x - minX) / rangeX) * (size - pad * 2),
    sy: pad + ((z - minZ) / rangeZ) * (size - pad * 2),
  });

  return (
    <div
      className="absolute bottom-4 right-4 rounded-xl overflow-hidden"
      style={{
        background: 'rgba(12,11,16,0.85)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(8px)',
        pointerEvents: 'none',
      }}
    >
      <div
        className="px-2 py-1 text-center"
        style={{
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.35)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        Map
      </div>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {tables.map((t) => {
          const { sx, sy } = toSvg(t.position[0], t.position[2]);
          const isCurrent = t.objectId === currentTableId;
          const isAvail =
            !availableTables || availableTables.size === 0 || availableTables.has(t.objectId);
          return (
            <circle
              key={t.objectId}
              cx={sx}
              cy={sy}
              r={isCurrent ? 6 : 4}
              fill={isCurrent ? '#C9A84C' : isAvail ? '#22c55e' : '#ef4444'}
              opacity={isCurrent ? 1 : 0.75}
              stroke={isCurrent ? '#fff' : 'none'}
              strokeWidth={isCurrent ? 1.5 : 0}
            />
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Standalone 360° panorama viewer modal.
 *
 * Self-contained: owns its own renderer, scene, camera, controls, and animation
 * loop. Mounts as a full-screen fixed overlay (good for mobile via 100dvh).
 *
 * Props:
 *   isOpen           — boolean, render the modal
 *   onClose          — () => void, called on back button
 *   photoUrl         — string, equirectangular JPEG URL
 *   heading          — number, owner-set rotation offset (degrees) so entrance faces center
 *   capturePoint     — [x, y, z] world coords where the photo was taken (optional)
 *   tableId          — string, the current table's id (for the label + minimap highlight)
 *   tableName        — string, display name
 *   objects          — array of floorplan objects (used to compute hotspots + minimap)
 *   availableTables  — Set<string> | null, table ids currently bookable; if null/empty all are treated as available
 *   onReserve        — () => void, optional. If provided, renders a "Reserve this Table" CTA inside the modal.
 */
export default function Panorama360Modal({
  isOpen,
  onClose,
  photoUrl,
  heading = 0,
  capturePoint,
  tableId,
  tableName,
  objects = [],
  availableTables = null,
  onReserve,
}) {
  const containerRef = useRef(null);
  const canvasParentRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const rafRef = useRef(null);
  const hotspotsRef = useRef([]); // [{ tableId, tableName, position: Vector3, isAvailable }]

  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [hotspots, setHotspots] = useState([]);

  // Lock body scroll while the modal is open (prevents background scroll on mobile)
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Build / tear down the Three.js scene
  useEffect(() => {
    if (!isOpen || !photoUrl || !canvasParentRef.current) return;

    const parent = canvasParentRef.current;
    const w = parent.clientWidth || window.innerWidth;
    const h = parent.clientHeight || window.innerHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    parent.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none'; // prevent page scroll while dragging
    rendererRef.current = renderer;

    // Scene with inside-out sphere
    const scene = new THREE.Scene();
    const sphereGeom = new THREE.SphereGeometry(50, 64, 32);
    sphereGeom.scale(-1, 1, 1);
    const placeholderMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const sphere = new THREE.Mesh(sphereGeom, placeholderMat);
    scene.add(sphere);
    sceneRef.current = scene;

    // Load equirectangular texture
    setPhotoLoaded(false);
    const texLoader = new THREE.TextureLoader();
    texLoader.load(
      photoUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        sphere.material.dispose();
        sphere.material = new THREE.MeshBasicMaterial({ map: texture });
        sphere.material.needsUpdate = true;
        setPhotoLoaded(true);
      },
      undefined,
      () => setPhotoLoaded(true) // mark "done" even on error so spinner clears
    );

    // Camera at sphere center
    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 200);
    camera.position.set(0, 0, 0.001);
    cameraRef.current = camera;

    // OrbitControls — look around only, no zoom/pan
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.rotateSpeed = -0.3; // inverted because camera is INSIDE the sphere
    controls.minPolarAngle = 0.15;
    controls.maxPolarAngle = Math.PI - 0.15;
    const headingRad = THREE.MathUtils.degToRad(heading || 0);
    controls.target.set(Math.sin(headingRad), 0, Math.cos(headingRad));
    controls.update();
    controlsRef.current = controls;

    // Compute hotspot positions for tables in the floorplan
    const cp = capturePoint
      ? new THREE.Vector3(...capturePoint)
      : new THREE.Vector3(0, 1.5, 0);
    const invHeading = THREE.MathUtils.degToRad(-(heading || 0));
    const yAxis = new THREE.Vector3(0, 1, 0);

    const computed = [];
    for (const obj of objects) {
      if (!obj.userData?.isTable) continue;
      const tablePos = new THREE.Vector3(...obj.position);
      const dir = tablePos.clone().sub(cp).normalize();
      dir.applyAxisAngle(yAxis, invHeading);
      const isAvail =
        !availableTables || availableTables.size === 0 || availableTables.has(obj.objectId);
      computed.push({
        tableId: obj.objectId,
        tableName: obj.userData?.customName || obj.objectId,
        position: dir.multiplyScalar(45),
        isAvailable: isAvail,
      });
    }
    hotspotsRef.current = computed;
    setHotspots(computed);

    // Animation loop
    const updateHotspotDom = () => {
      const c = containerRef.current;
      if (!c || !cameraRef.current) return;
      const cw = c.clientWidth || 1;
      const ch = c.clientHeight || 1;
      for (const hs of hotspotsRef.current) {
        const el = c.querySelector(`[data-hs-table-id="${hs.tableId}"]`);
        if (!el) continue;
        const ndc = hs.position.clone().project(cameraRef.current);
        if (ndc.z > 1) {
          el.style.display = 'none';
          continue;
        }
        const x = ((ndc.x + 1) / 2) * cw;
        const y = ((1 - ndc.y) / 2) * ch;
        if (x < -30 || x > cw + 30 || y < -30 || y > ch + 30) {
          el.style.display = 'none';
        } else {
          el.style.display = 'flex';
          el.style.left = x + 'px';
          el.style.top = y + 'px';
        }
      }
    };

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
      updateHotspotDom();
    };
    tick();

    // Resize
    const onResize = () => {
      if (!parent || !rendererRef.current || !cameraRef.current) return;
      const nw = parent.clientWidth;
      const nh = parent.clientHeight;
      cameraRef.current.aspect = nw / nh;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }
      if (sceneRef.current) {
        sceneRef.current.traverse((o) => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) {
            if (o.material.map) o.material.map.dispose();
            o.material.dispose();
          }
        });
        sceneRef.current = null;
      }
      if (rendererRef.current) {
        if (rendererRef.current.domElement?.parentNode) {
          rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      cameraRef.current = null;
      hotspotsRef.current = [];
    };
  }, [isOpen, photoUrl, heading, capturePoint, objects, availableTables]);

  const handleBack = useCallback(() => {
    setPhotoLoaded(false);
    onClose?.();
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          ref={containerRef}
          className="fixed inset-0 z-50"
          style={{
            background: '#000',
            height: '100dvh', // proper mobile fullscreen (handles iOS URL bar)
            width: '100vw',
          }}
        >
          {/* Three.js canvas mount point */}
          <div
            ref={canvasParentRef}
            className="absolute inset-0"
            style={{ pointerEvents: 'auto' }}
          />

          {/* Loading spinner */}
          {!photoLoaded && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-12 h-12 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: '#C9A84C', borderTopColor: 'transparent' }}
              />
            </div>
          )}

          {/* Back button — large tap target for mobile */}
          <button
            type="button"
            onClick={handleBack}
            className="absolute top-4 left-4 z-10 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
            style={{
              background: 'rgba(12,11,16,0.85)',
              border: '1px solid rgba(201,168,76,0.35)',
              color: '#C9A84C',
              backdropFilter: 'blur(8px)',
              minHeight: '44px',
              minWidth: '44px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            ← Back
          </button>

          {/* Label bar */}
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-sm z-10"
            style={{
              background: 'rgba(12,11,16,0.85)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#9B96A8',
              backdropFilter: 'blur(8px)',
              whiteSpace: 'nowrap',
              maxWidth: 'calc(100vw - 200px)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            360° View
            {tableName && (
              <span className="ml-2 font-semibold" style={{ color: '#C9A84C' }}>
                · {tableName}
              </span>
            )}
          </div>

          {/* Drag hint */}
          {photoLoaded && (
            <div
              className="absolute bottom-20 left-1/2 -translate-x-1/2 text-xs px-3 py-1.5 rounded-full pointer-events-none"
              style={{
                background: 'rgba(12,11,16,0.65)',
                color: 'rgba(255,255,255,0.55)',
                backdropFilter: 'blur(4px)',
              }}
            >
              Drag to look around
            </div>
          )}

          {/* Hotspot dots — positioned per-frame by the animation loop */}
          {hotspots.map((hs) => (
            <div
              key={hs.tableId}
              data-hs-table-id={hs.tableId}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ display: 'none', pointerEvents: 'none' }}
            >
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#F5F0E8',
                  background: 'rgba(12,11,16,0.85)',
                  padding: '2px 6px',
                  borderRadius: '5px',
                  marginBottom: '4px',
                  whiteSpace: 'nowrap',
                }}
              >
                {hs.tableName}
              </span>
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: hs.isAvailable ? '#22c55e' : '#ef4444',
                  border: '2px solid rgba(255,255,255,0.85)',
                  boxShadow: `0 0 10px ${hs.isAvailable ? '#22c55e88' : '#ef444488'}`,
                }}
              />
            </div>
          ))}

          {/* Minimap */}
          <PanoramaMinimap
            objects={objects}
            currentTableId={tableId}
            availableTables={availableTables}
          />

          {/* Optional Reserve CTA — bottom of screen, big touch target */}
          {onReserve && (
            <button
              type="button"
              onClick={onReserve}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl font-bold text-sm"
              style={{
                background: '#C9A84C',
                color: '#0C0B10',
                minHeight: '48px',
                boxShadow: '0 4px 14px rgba(201,168,76,0.4)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Reserve {tableName}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
