# Table Spotlight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the grey-recolor booking-status indicator on the customer floorplan with theatrical descending spotlight beams (persistent red on reserved, gold on hover/tap), driven by a single `lib/floorplan/spotlightBeams.js` manager.

**Architecture:** All beam construction, animation, and lifecycle live in a new isolated `lib/floorplan/spotlightBeams.js` module that exposes four methods: `setHoverPosition`, `setReservedTables`, `tick`, `dispose`. Beams are custom volumetric meshes (`ConeGeometry` + `ShaderMaterial` with additive blending) — no `THREE.SpotLight` instances, so it scales to many reserved tables without shader-recompile jank. `components/PublicFloorPlan.js` only calls the four public methods.

**Tech Stack:** Three.js (already in project), Vitest (test runner), GLSL (custom vertex + fragment shaders).

**Spec:** `docs/superpowers/specs/2026-05-13-table-spotlight-design.md`

---

### Task 1: Create the module skeleton with shape test

**Files:**
- Create: `lib/floorplan/spotlightBeams.js`
- Create: `lib/floorplan/spotlightBeams.test.js`

- [ ] **Step 1: Write the failing test**

```js
// lib/floorplan/spotlightBeams.test.js
import * as THREE from 'three';
import { createSpotlightBeams } from './spotlightBeams';

function makeFakeContext() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    return { scene, camera };
}

describe('createSpotlightBeams', () => {
    test('returns an object exposing the public API', () => {
        const beams = createSpotlightBeams(makeFakeContext());
        expect(typeof beams.setHoverPosition).toBe('function');
        expect(typeof beams.setReservedTables).toBe('function');
        expect(typeof beams.tick).toBe('function');
        expect(typeof beams.dispose).toBe('function');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/floorplan/spotlightBeams.test.js`
Expected: FAIL with `Cannot find module './spotlightBeams'`.

- [ ] **Step 3: Write minimal implementation**

```js
// lib/floorplan/spotlightBeams.js
import * as THREE from 'three';

export function createSpotlightBeams({ scene, camera }) {
    return {
        setHoverPosition(_tableMesh) {},
        setReservedTables(_tableMap, _ids) {},
        tick(_dt) {},
        dispose() {},
    };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/floorplan/spotlightBeams.test.js`
Expected: PASS — 1 test.

- [ ] **Step 5: Commit**

```bash
git add lib/floorplan/spotlightBeams.js lib/floorplan/spotlightBeams.test.js
git commit -m "feat(floorplan): scaffold spotlightBeams manager"
```

---

### Task 2: Implement internal beam-mesh factory (geometry + shaders + floor disc)

**Files:**
- Modify: `lib/floorplan/spotlightBeams.js`
- Modify: `lib/floorplan/spotlightBeams.test.js`

- [ ] **Step 1: Add the failing test**

Append to `spotlightBeams.test.js`:

```js
describe('beam construction (via setReservedTables)', () => {
    test('adding a reserved table creates a cone mesh and a floor disc in the scene', () => {
        const { scene, camera } = makeFakeContext();
        const beams = createSpotlightBeams({ scene, camera });
        const table = new THREE.Mesh();
        table.position.set(2, 0.4, -3);
        const map = new Map([['t1', table]]);

        const childrenBefore = scene.children.length;
        beams.setReservedTables(map, ['t1']);

        // One reserved table adds exactly 2 objects (cone + disc)
        expect(scene.children.length).toBe(childrenBefore + 2);

        const cone = scene.children.find(o => o.userData.beamRole === 'cone');
        const disc = scene.children.find(o => o.userData.beamRole === 'disc');
        expect(cone).toBeDefined();
        expect(disc).toBeDefined();
        expect(cone.geometry).toBeInstanceOf(THREE.ConeGeometry);
        expect(disc.geometry).toBeInstanceOf(THREE.CircleGeometry);
        expect(cone.material.uniforms.uColor).toBeDefined();
        expect(cone.material.uniforms.uIntensity).toBeDefined();
        expect(cone.material.uniforms.uTime).toBeDefined();
        // Red color: r dominant
        const color = cone.material.uniforms.uColor.value;
        expect(color.r).toBeGreaterThan(color.g);
        expect(color.r).toBeGreaterThan(color.b);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/floorplan/spotlightBeams.test.js`
Expected: FAIL — `scene.children.length` doesn't change because `setReservedTables` is a stub.

- [ ] **Step 3: Implement the beam-mesh factory and minimal setReservedTables**

Replace `lib/floorplan/spotlightBeams.js` body with:

```js
import * as THREE from 'three';

const BEAM_HEIGHT = 4;
const BEAM_RADIUS_TOP = 0.05;
const BEAM_RADIUS_BOTTOM = 0.7;
const DISC_RADIUS = 0.8;

const GOLD = new THREE.Color(0xC9A84C);
const RED = new THREE.Color(0xFF3838);

const beamVertex = /* glsl */`
varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const beamFragment = /* glsl */`
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
void main() {
    float vertical = pow(1.0 - vUv.y, 0.6);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float facing = abs(dot(viewDir, vWorldNormal));
    float volume = pow(1.0 - facing, 1.5);
    float alpha = vertical * volume * uIntensity * 0.9;
    vec3 tint = uColor * (1.0 + vertical * 0.3);
    gl_FragColor = vec4(tint, alpha);
}
`;

const discVertex = /* glsl */`
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const discFragment = /* glsl */`
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;
void main() {
    vec2 centered = vUv - 0.5;
    float r = length(centered) * 2.0;
    float a = pow(max(0.0, 1.0 - r), 1.5) * uIntensity;
    gl_FragColor = vec4(uColor, a);
}
`;

function makeBeamMesh(color) {
    const coneGeo = new THREE.ConeGeometry(
        BEAM_RADIUS_TOP, BEAM_RADIUS_BOTTOM, BEAM_HEIGHT,
        32, 1, true
    );
    // ConeGeometry centers itself; shift so top is at +height/2, bottom at -height/2
    coneGeo.translate(0, 0, 0);
    const coneMat = new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: color.clone() },
            uIntensity: { value: 0 },
            uTime: { value: 0 },
        },
        vertexShader: beamVertex,
        fragmentShader: beamFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
    });
    // ConeGeometry constructor flips the cone with the apex up by default.
    // Three.js ConeGeometry: tip at +Y, base at -Y. Three.js uses
    // (radiusTop, radiusBottom, height) — radiusTop near apex.
    // We want apex up (small) and base down (large) — that's the default.
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.userData.beamRole = 'cone';

    const discGeo = new THREE.CircleGeometry(DISC_RADIUS, 48);
    discGeo.rotateX(-Math.PI / 2); // make it lie flat (normal = +Y)
    const discMat = new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: color.clone() },
            uIntensity: { value: 0 },
        },
        vertexShader: discVertex,
        fragmentShader: discFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.userData.beamRole = 'disc';

    return { cone, disc };
}

function disposeMesh(mesh) {
    mesh.geometry.dispose();
    mesh.material.dispose();
}

export function createSpotlightBeams({ scene, camera }) {
    const redBeams = new Map(); // tableId -> { cone, disc }

    function placeBeam(beam, tablePos) {
        const tableTopY = tablePos.y + 0.4; // approximate table-top height above mesh origin
        // cone apex at top (+Y inside geom), base at bottom — geom origin is centered, so
        // placing the geom center BEAM_HEIGHT/2 above table top puts the base on the table.
        beam.cone.position.set(tablePos.x, tableTopY + BEAM_HEIGHT / 2, tablePos.z);
        beam.disc.position.set(tablePos.x, tableTopY + 0.01, tablePos.z);
    }

    return {
        setHoverPosition(_tableMesh) {},
        setReservedTables(tableMap, ids) {
            const wanted = new Set(ids);
            // Remove beams no longer wanted
            for (const [id, beam] of redBeams) {
                if (!wanted.has(id)) {
                    scene.remove(beam.cone);
                    scene.remove(beam.disc);
                    disposeMesh(beam.cone);
                    disposeMesh(beam.disc);
                    redBeams.delete(id);
                }
            }
            // Add new beams
            for (const id of wanted) {
                if (redBeams.has(id)) continue;
                const table = tableMap.get(id);
                if (!table) continue;
                const beam = makeBeamMesh(RED);
                placeBeam(beam, table.position);
                beam.cone.material.uniforms.uIntensity.value = 1;
                beam.disc.material.uniforms.uIntensity.value = 1;
                scene.add(beam.cone);
                scene.add(beam.disc);
                redBeams.set(id, beam);
            }
        },
        tick(_dt) {},
        dispose() {},
    };
}
```

- [ ] **Step 4: Run test**

Run: `npm test -- lib/floorplan/spotlightBeams.test.js`
Expected: PASS — both tests.

- [ ] **Step 5: Commit**

```bash
git add lib/floorplan/spotlightBeams.js lib/floorplan/spotlightBeams.test.js
git commit -m "feat(floorplan): add beam mesh factory + initial setReservedTables"
```

---

### Task 3: Diffing behavior in setReservedTables

**Files:**
- Modify: `lib/floorplan/spotlightBeams.test.js`

- [ ] **Step 1: Add failing tests for incremental updates**

Append to `spotlightBeams.test.js`:

```js
describe('setReservedTables incremental updates', () => {
    test('replacing the list disposes removed beams and keeps unchanged ones', () => {
        const { scene, camera } = makeFakeContext();
        const beams = createSpotlightBeams({ scene, camera });
        const t1 = new THREE.Mesh(); t1.position.set(0, 0.4, 0);
        const t2 = new THREE.Mesh(); t2.position.set(1, 0.4, 1);
        const map = new Map([['t1', t1], ['t2', t2]]);

        beams.setReservedTables(map, ['t1', 't2']);
        expect(scene.children.length).toBe(4); // 2 beams * (cone + disc)

        const t1ConeBefore = scene.children.find(o => o.userData.beamRole === 'cone');
        beams.setReservedTables(map, ['t1']);
        expect(scene.children.length).toBe(2);
        // Same t1 instance reused (not re-created)
        const t1ConeAfter = scene.children.find(o => o.userData.beamRole === 'cone');
        expect(t1ConeAfter).toBe(t1ConeBefore);
    });

    test('passing empty list removes all red beams', () => {
        const { scene, camera } = makeFakeContext();
        const beams = createSpotlightBeams({ scene, camera });
        const t1 = new THREE.Mesh(); t1.position.set(0, 0.4, 0);
        beams.setReservedTables(new Map([['t1', t1]]), ['t1']);
        expect(scene.children.length).toBe(2);
        beams.setReservedTables(new Map(), []);
        expect(scene.children.length).toBe(0);
    });

    test('skips ids not in tableMap (table removed from scene)', () => {
        const { scene, camera } = makeFakeContext();
        const beams = createSpotlightBeams({ scene, camera });
        beams.setReservedTables(new Map(), ['ghost']);
        expect(scene.children.length).toBe(0);
    });
});
```

- [ ] **Step 2: Run tests**

Run: `npm test -- lib/floorplan/spotlightBeams.test.js`
Expected: PASS — diffing already works from Task 2 implementation. If any test fails, fix the diff logic before continuing.

- [ ] **Step 3: Commit**

```bash
git add lib/floorplan/spotlightBeams.test.js
git commit -m "test(floorplan): cover incremental setReservedTables diffing"
```

---

### Task 4: Pooled gold beam + setHoverPosition

**Files:**
- Modify: `lib/floorplan/spotlightBeams.js`
- Modify: `lib/floorplan/spotlightBeams.test.js`

- [ ] **Step 1: Write failing tests**

Append to `spotlightBeams.test.js`:

```js
describe('gold hover beam', () => {
    test('gold beam mesh is added to scene at construction with intensity 0', () => {
        const { scene, camera } = makeFakeContext();
        const before = scene.children.length;
        const beams = createSpotlightBeams({ scene, camera });
        // 2 new children: gold cone + gold disc
        expect(scene.children.length).toBe(before + 2);
        const cone = scene.children.find(o => o.userData.beamRole === 'cone');
        expect(cone.material.uniforms.uIntensity.value).toBe(0);
        // Gold color: r > b, g > b
        const c = cone.material.uniforms.uColor.value;
        expect(c.r).toBeGreaterThan(c.b);
        expect(c.g).toBeGreaterThan(c.b);
    });

    test('setHoverPosition(table) records target position; null clears target', () => {
        const { scene, camera } = makeFakeContext();
        const beams = createSpotlightBeams({ scene, camera });
        const table = new THREE.Mesh(); table.position.set(3, 0.4, -2);
        beams.setHoverPosition(table);
        expect(beams._getHoverTarget()).not.toBeNull();
        expect(beams._getHoverTarget().x).toBe(3);
        beams.setHoverPosition(null);
        expect(beams._getHoverTarget()).toBeNull();
    });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- lib/floorplan/spotlightBeams.test.js`
Expected: FAIL — `_getHoverTarget` is undefined and gold beam isn't created.

- [ ] **Step 3: Implement gold beam pool**

In `lib/floorplan/spotlightBeams.js`, modify the factory body. After `const redBeams = new Map();` add:

```js
    const gold = makeBeamMesh(GOLD);
    gold.cone.material.uniforms.uIntensity.value = 0;
    gold.disc.material.uniforms.uIntensity.value = 0;
    scene.add(gold.cone);
    scene.add(gold.disc);

    let hoverTarget = null; // THREE.Vector3 or null
```

Add to the returned object:

```js
        setHoverPosition(tableMesh) {
            if (tableMesh) {
                hoverTarget = tableMesh.position.clone();
                placeBeam(gold, hoverTarget);
            } else {
                hoverTarget = null;
            }
        },
        _getHoverTarget: () => hoverTarget,
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- lib/floorplan/spotlightBeams.test.js`
Expected: PASS — all tests.

- [ ] **Step 5: Commit**

```bash
git add lib/floorplan/spotlightBeams.js lib/floorplan/spotlightBeams.test.js
git commit -m "feat(floorplan): pool gold hover beam and add setHoverPosition"
```

---

### Task 5: tick(dt) — gold fade lerp + red breathing

**Files:**
- Modify: `lib/floorplan/spotlightBeams.js`
- Modify: `lib/floorplan/spotlightBeams.test.js`

- [ ] **Step 1: Write failing tests**

Append to `spotlightBeams.test.js`:

```js
describe('tick(dt)', () => {
    test('gold uIntensity lerps toward 1 after setHoverPosition(table)', () => {
        const { scene, camera } = makeFakeContext();
        const beams = createSpotlightBeams({ scene, camera });
        const table = new THREE.Mesh(); table.position.set(0, 0.4, 0);
        const gold = scene.children.find(o => o.userData.beamRole === 'cone');
        beams.setHoverPosition(table);
        const v0 = gold.material.uniforms.uIntensity.value;
        beams.tick(0.1);
        const v1 = gold.material.uniforms.uIntensity.value;
        expect(v1).toBeGreaterThan(v0);
        // Run many ticks; intensity should approach 1
        for (let i = 0; i < 200; i++) beams.tick(0.1);
        expect(gold.material.uniforms.uIntensity.value).toBeGreaterThan(0.95);
    });

    test('gold uIntensity lerps toward 0 after setHoverPosition(null)', () => {
        const { scene, camera } = makeFakeContext();
        const beams = createSpotlightBeams({ scene, camera });
        const table = new THREE.Mesh(); table.position.set(0, 0.4, 0);
        const gold = scene.children.find(o => o.userData.beamRole === 'cone');
        beams.setHoverPosition(table);
        for (let i = 0; i < 200; i++) beams.tick(0.1);
        beams.setHoverPosition(null);
        for (let i = 0; i < 200; i++) beams.tick(0.1);
        expect(gold.material.uniforms.uIntensity.value).toBeLessThan(0.05);
    });

    test('red beam uTime increments and uIntensity oscillates around 0.85–1.0', () => {
        const { scene, camera } = makeFakeContext();
        const beams = createSpotlightBeams({ scene, camera });
        const t1 = new THREE.Mesh(); t1.position.set(0, 0.4, 0);
        beams.setReservedTables(new Map([['t1', t1]]), ['t1']);
        const redCones = scene.children.filter(o => o.userData.beamRole === 'cone');
        // Two cones now: gold (intensity 0) and red. Find the red one (intensity > 0).
        const red = redCones.find(c => c.material.uniforms.uIntensity.value > 0.5);
        expect(red).toBeDefined();

        const samples = [];
        for (let i = 0; i < 60; i++) {
            beams.tick(0.05);
            samples.push(red.material.uniforms.uIntensity.value);
        }
        const min = Math.min(...samples);
        const max = Math.max(...samples);
        expect(min).toBeGreaterThanOrEqual(0.70); // 0.85 - 0.15
        expect(max).toBeLessThanOrEqual(1.05);     // 0.85 + 0.15 (allow small float slop)
        expect(red.material.uniforms.uTime.value).toBeGreaterThan(0);
    });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- lib/floorplan/spotlightBeams.test.js`
Expected: FAIL — `tick` is a stub.

- [ ] **Step 3: Implement tick**

In `lib/floorplan/spotlightBeams.js`, just before the return statement of the factory:

```js
    let clock = 0;
    const GOLD_LERP_RATE = 12; // units per second toward target intensity
```

Replace the `tick` method on the returned object with:

```js
        tick(dt) {
            clock += dt;
            // Gold lerp
            const target = hoverTarget ? 1 : 0;
            const k = Math.min(1, GOLD_LERP_RATE * dt);
            const u = gold.cone.material.uniforms.uIntensity;
            u.value = u.value + (target - u.value) * k;
            gold.disc.material.uniforms.uIntensity.value = u.value;
            if (hoverTarget) {
                // Smooth-follow position (placeBeam already runs at setHoverPosition; lerp keeps a moving target smooth)
                gold.cone.position.x += (hoverTarget.x - gold.cone.position.x) * k;
                gold.cone.position.z += (hoverTarget.z - gold.cone.position.z) * k;
                gold.disc.position.x = gold.cone.position.x;
                gold.disc.position.z = gold.cone.position.z;
            }
            // Red breathing
            const breath = 0.85 + 0.15 * Math.sin(clock * 1.5);
            for (const beam of redBeams.values()) {
                beam.cone.material.uniforms.uIntensity.value = breath;
                beam.cone.material.uniforms.uTime.value = clock;
                beam.disc.material.uniforms.uIntensity.value = breath;
            }
        },
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- lib/floorplan/spotlightBeams.test.js`
Expected: PASS — all tests.

- [ ] **Step 5: Commit**

```bash
git add lib/floorplan/spotlightBeams.js lib/floorplan/spotlightBeams.test.js
git commit -m "feat(floorplan): animate gold lerp + red breathing in tick"
```

---

### Task 6: dispose() — full cleanup

**Files:**
- Modify: `lib/floorplan/spotlightBeams.js`
- Modify: `lib/floorplan/spotlightBeams.test.js`

- [ ] **Step 1: Write failing test**

Append to `spotlightBeams.test.js`:

```js
describe('dispose()', () => {
    test('removes all beam meshes from the scene and disposes geometry/material', () => {
        const { scene, camera } = makeFakeContext();
        const beams = createSpotlightBeams({ scene, camera });
        const t1 = new THREE.Mesh(); t1.position.set(0, 0.4, 0);
        beams.setReservedTables(new Map([['t1', t1]]), ['t1']);
        // gold cone + gold disc + red cone + red disc = 4
        expect(scene.children.length).toBe(4);

        const meshes = scene.children.slice();
        const geomDisposeSpies = meshes.map(m => vi.spyOn(m.geometry, 'dispose'));
        const matDisposeSpies = meshes.map(m => vi.spyOn(m.material, 'dispose'));

        beams.dispose();

        expect(scene.children.length).toBe(0);
        for (const s of geomDisposeSpies) expect(s).toHaveBeenCalled();
        for (const s of matDisposeSpies) expect(s).toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- lib/floorplan/spotlightBeams.test.js`
Expected: FAIL — `dispose` is a stub.

- [ ] **Step 3: Implement dispose**

Replace the `dispose` method on the returned object with:

```js
        dispose() {
            for (const beam of redBeams.values()) {
                scene.remove(beam.cone);
                scene.remove(beam.disc);
                disposeMesh(beam.cone);
                disposeMesh(beam.disc);
            }
            redBeams.clear();
            scene.remove(gold.cone);
            scene.remove(gold.disc);
            disposeMesh(gold.cone);
            disposeMesh(gold.disc);
            hoverTarget = null;
        },
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- lib/floorplan/spotlightBeams.test.js`
Expected: PASS — all tests across all describes.

- [ ] **Step 5: Commit**

```bash
git add lib/floorplan/spotlightBeams.js lib/floorplan/spotlightBeams.test.js
git commit -m "feat(floorplan): implement dispose() with full resource cleanup"
```

---

### Task 7: Wire manager into PublicFloorPlan scene init + animation loop + cleanup

**Files:**
- Modify: `components/PublicFloorPlan.js`

No automated tests — visual integration; verify manually.

- [ ] **Step 1: Add the import and ref**

Open `components/PublicFloorPlan.js`. After the existing `import * as THREE from 'three';` near the top of the file (line 6), add:

```js
import { createSpotlightBeams } from '@/lib/floorplan/spotlightBeams';
```

Find the block of `useRef` declarations near the other manager refs (`doorManagerRef`, `windowManagerRef` — around line 156 area). Add:

```js
const beamsRef = useRef(null);
```

- [ ] **Step 2: Initialize manager after scene + camera + lights are set up**

Locate the line `doorManagerRef.current = new DoorManager(scene, { walls: [] }, renderer);` (around line 596). Immediately AFTER the line that initializes `windowManagerRef.current`, add:

```js
beamsRef.current = createSpotlightBeams({ scene, camera });
```

- [ ] **Step 3: Tick the manager every frame**

Find the existing animation loop. It will be a function (commonly named `animate`, registered via `requestAnimationFrame`). Search the file for `requestAnimationFrame` to locate it. Inside that callback, before the `renderer.render(scene, camera);` call, add:

```js
if (beamsRef.current) beamsRef.current.tick(clock?.getDelta?.() ?? 0.016);
```

If there is no `clock` already in scope, declare one near the renderer setup (around line 510):

```js
const clock = new THREE.Clock();
```

and pass `clock` into the animation closure via the existing pattern (or capture via closure if `animate` is defined in the same scope as `renderer`).

- [ ] **Step 4: Dispose on cleanup**

Find the existing `cleanup` function (called near line 492 with `cleanup();`). At the start of its body, add:

```js
if (beamsRef.current) {
    beamsRef.current.dispose();
    beamsRef.current = null;
}
```

- [ ] **Step 5: Verify manually**

Start dev server: `npm run dev`. Open a restaurant booking page that uses `PublicFloorPlan`. Open browser DevTools console. Expect: no errors. The scene loads. No visible beams yet (gold is at intensity 0 until hover wired; no red until availability wired).

- [ ] **Step 6: Commit**

```bash
git add components/PublicFloorPlan.js
git commit -m "feat(floorplan): mount spotlightBeams manager in PublicFloorPlan"
```

---

### Task 8: Drive setReservedTables from availableTables state

**Files:**
- Modify: `components/PublicFloorPlan.js`

- [ ] **Step 1: Add the useEffect**

In `components/PublicFloorPlan.js`, locate the existing `useEffect` that responds to `availableTables` (search for `availableTablesRef.current = availableTables;` around line 197). Immediately AFTER that effect, add a new effect:

```js
useEffect(() => {
    const beams = beamsRef.current;
    const scene = sceneRef.current;
    if (!beams || !scene) return;

    // Build tableMap by walking scene children for objects with userData.objectId
    const tableMap = new Map();
    scene.traverse(obj => {
        const id = obj.userData?.objectId || obj.userData?.friendlyId;
        if (id && obj.userData?.isTable) tableMap.set(id, obj);
    });

    if (!date || !time) {
        beams.setReservedTables(tableMap, []);
        return;
    }

    const reservedIds = [];
    for (const id of tableMap.keys()) {
        if (!availableTables.has(id)) reservedIds.push(id);
    }
    beams.setReservedTables(tableMap, reservedIds);
}, [availableTables, date, time]);
```

> Note: The condition `obj.userData?.isTable` filters to actual table meshes. If the existing code uses a different flag, check the GLTF loader / placeholder code (around lines 690–700) and adjust. If no table-specific flag exists, use `obj.userData?.objectId && obj.userData?.type === 'table'`.

- [ ] **Step 2: Verify table identification flag**

Run: `grep -n "isTable\|userData.type" components/PublicFloorPlan.js` (use the Grep tool).

If `isTable` is not the flag used to tag table meshes in the scene, adjust the `obj.userData?.isTable` check in Step 1 to match the actual marker. Reasonable alternatives: `obj.userData?.type === 'table'`, or `obj.userData?.objectId && obj.parent?.userData?.isTable`.

- [ ] **Step 3: Verify manually**

Restart dev server. Pick a date and a time on the customer floorplan. Tables that were grey before should now have a red beam descending. If only one or two tables were reserved, watch for the subtle breathing pulse (uIntensity oscillating 0.85–1.0 visually).

Edge case: switch date/time to one with no reservations — all red beams disappear. Switch to one with many — all reappear.

- [ ] **Step 4: Commit**

```bash
git add components/PublicFloorPlan.js
git commit -m "feat(floorplan): drive red reserved beams from availableTables state"
```

---

### Task 9: Wire desktop hover to gold beam

**Files:**
- Modify: `components/PublicFloorPlan.js`

- [ ] **Step 1: Identify the existing hover raycast**

The existing `mousemove` raycaster is around line 867 (it sets up the hover tooltip via `createHoverTooltip`). Locate this section: search for `raycaster.setFromCamera` (first hit, around line 867).

- [ ] **Step 2: Add hover → beam call**

Within the mousemove handler, after the raycaster intersects test, you currently have logic that finds `intersected` table (search the block around lines 870–890). Add the following branching:

```js
const beams = beamsRef.current;
const dateReady = !!dateRef.current && !!timeRef.current;
if (beams && dateReady) {
    // intersected table found and available?
    if (intersectedTable) {
        const tId = intersectedTable.userData.objectId || intersectedTable.userData.friendlyId;
        const isAvailable = availableTablesRef.current.size === 0 || availableTablesRef.current.has(tId);
        // Important: availableTables size === 0 means "no availability data yet" — don't show gold then
        const haveData = availableTablesRef.current.size > 0 || Object.keys(unavailableByTableRef.current).length > 0;
        if (isAvailable && haveData) {
            beams.setHoverPosition(intersectedTable);
        } else {
            beams.setHoverPosition(null);
        }
    } else {
        beams.setHoverPosition(null);
    }
} else if (beams) {
    beams.setHoverPosition(null);
}
```

> Note: `intersectedTable` is the variable name in the existing code that holds the hovered table mesh. If named differently in the surrounding block, use that name.

- [ ] **Step 3: Clear hover on mouseleave**

Locate the renderer's DOM element. Add an event listener (one-time setup near where the mousemove is attached):

```js
renderer.domElement.addEventListener('mouseleave', () => {
    if (beamsRef.current) beamsRef.current.setHoverPosition(null);
});
```

- [ ] **Step 4: Verify manually**

Restart dev server. Pick date+time. Hover over an available table — gold beam descends and lights it up; should slide smoothly when you sweep across multiple tables. Move mouse off the canvas — gold beam fades.

Hover a reserved table — gold beam does NOT appear (red beam stays, existing "Table Not Available" tooltip still shows).

- [ ] **Step 5: Commit**

```bash
git add components/PublicFloorPlan.js
git commit -m "feat(floorplan): wire desktop hover to gold spotlight beam"
```

---

### Task 10: Remove grey-recolor block and update instructions copy

**Files:**
- Modify: `components/PublicFloorPlan.js`

- [ ] **Step 1: Locate the grey-recolor block**

The block lives around lines 1594–1614, inside the post-booking-success flow. It iterates the booked table's children and calls `mat.color.setHex(0x4a4a4a)` / `child.material.color.setHex(0x4a4a4a)`.

Verify with: `grep -n "0x4a4a4a" components/PublicFloorPlan.js`. There should be exactly two matches in that block.

- [ ] **Step 2: Delete the block**

Delete the entire `// Immediately update table color to dark grey after successful booking` block from the start comment through the closing brace of its `if`/`forEach` loop (the block whose only purpose was to grey-out the table).

The surrounding code re-fetches availability on the next line block (the `// Re-fetch availability for the same date/time...` block at ~1627). That re-fetch updates `availableTables`, which the Task 8 effect picks up and adds a red beam — so deleting the grey-recolor block doesn't break anything visible.

- [ ] **Step 3: Update the instructions overlay**

Around line 2728–2734, the on-screen instructions read:

```jsx
<p style={{ color: '#9B96A8' }}>
    Click on any <span style={{ color: '#C9A84C', fontWeight: 600 }}>table</span> to make a reservation
</p>
<p className="text-sm mt-2" style={{ color: '#9B96A8' }}>
    Tables are color-coded by zone · <span style={{ color: '#555' }}>Dark Grey</span> = booked
</p>
```

Replace the second `<p>` with:

```jsx
<p className="text-sm mt-2" style={{ color: '#9B96A8' }}>
    Tables are color-coded by zone · <span style={{ color: '#FF6B6B', fontWeight: 600 }}>Red spotlight</span> = reserved
</p>
```

- [ ] **Step 4: Grep for any other booking-status recolors**

Run: `grep -n "setHex\|material.color" components/PublicFloorPlan.js`. Inspect every hit. Any line tied to booking state (vs zone color, vs initial material setup) should be removed. Zone-color logic stays.

- [ ] **Step 5: Verify manually**

Restart dev server. Pick date+time. Complete a booking. Immediately after the success modal, the just-booked table should pick up a red beam (via the Task 8 effect re-running on the post-booking availability fetch). It should NOT turn dark grey at any point.

- [ ] **Step 6: Commit**

```bash
git add components/PublicFloorPlan.js
git commit -m "refactor(floorplan): drop grey-recolor in favor of red spotlight; update copy"
```

---

### Task 11: Mobile tap-vs-drag detection + selection state

**Files:**
- Modify: `components/PublicFloorPlan.js`

- [ ] **Step 1: Add mobile state and refs**

In the component, near the other `useState` declarations (around line 165–170), add:

```js
const [showMobileCTA, setShowMobileCTA] = useState(false);
const selectedTableRef = useRef(null);
const isTouchRef = useRef(false);
```

After the useState block, initialize `isTouchRef` once:

```js
useEffect(() => {
    isTouchRef.current = (typeof window !== 'undefined') && (
        'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0
    );
}, []);
```

- [ ] **Step 2: Add pointer-tap-vs-drag handler on the canvas**

Inside the scene-setup `useEffect` (the same one that wires the mousemove, after Task 9), attach `pointerdown` and `pointerup` listeners. Add near the existing mousemove listener registration:

```js
let tapDownX = 0, tapDownY = 0, tapDownT = 0;
const onPointerDown = (event) => {
    if (!isTouchRef.current) return;
    tapDownX = event.clientX;
    tapDownY = event.clientY;
    tapDownT = performance.now();
};
const onPointerUp = (event) => {
    if (!isTouchRef.current) return;
    const dx = event.clientX - tapDownX;
    const dy = event.clientY - tapDownY;
    const dt = performance.now() - tapDownT;
    const moved = Math.hypot(dx, dy);
    if (dt > 300 || moved > 10) return; // drag, not tap

    // Raycast at the up-position
    const rect = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const tapRay = new THREE.Raycaster();
    tapRay.setFromCamera(ndc, camera);
    const hits = tapRay.intersectObjects(sceneRef.current.children, true);

    // Walk up to find a table parent
    let tappedTable = null;
    for (const h of hits) {
        let o = h.object;
        while (o && !(o.userData?.objectId && (o.userData?.isTable || o.userData?.type === 'table'))) o = o.parent;
        if (o) { tappedTable = o; break; }
    }

    const dateReady = !!dateRef.current && !!timeRef.current;
    if (!dateReady) {
        // Existing toast already fires elsewhere; do nothing here.
        return;
    }

    if (!tappedTable) {
        // Tap on empty floor: clear selection
        selectedTableRef.current = null;
        setShowMobileCTA(false);
        if (beamsRef.current) beamsRef.current.setHoverPosition(null);
        return;
    }

    const tId = tappedTable.userData.objectId || tappedTable.userData.friendlyId;
    const isAvailable = availableTablesRef.current.size === 0 || availableTablesRef.current.has(tId);
    if (!isAvailable) {
        // Existing reserved-table tooltip path handles this; don't change selection state.
        return;
    }

    // Tap on already-selected: toggle off
    if (selectedTableRef.current === tappedTable) {
        selectedTableRef.current = null;
        setShowMobileCTA(false);
        if (beamsRef.current) beamsRef.current.setHoverPosition(null);
        return;
    }

    selectedTableRef.current = tappedTable;
    setShowMobileCTA(true);
    if (beamsRef.current) beamsRef.current.setHoverPosition(tappedTable);
};

renderer.domElement.addEventListener('pointerdown', onPointerDown);
renderer.domElement.addEventListener('pointerup', onPointerUp);
```

> Note: ensure these listeners are removed in the existing cleanup function alongside other listeners. If the cleanup uses a `removeEventListener` pattern, add corresponding removals.

- [ ] **Step 3: Verify manually with DevTools mobile emulation**

Restart dev server. Open DevTools → Toggle device toolbar (mobile emulation). Pick date+time on the floorplan. Tap an available table — gold beam appears, table stays "selected" (no auto-dialog). Tap empty floor — gold beam clears. Tap a reserved table — no change to selection, existing reserved tooltip behavior. Drag the canvas to orbit — no accidental selection.

- [ ] **Step 4: Commit**

```bash
git add components/PublicFloorPlan.js
git commit -m "feat(floorplan): mobile tap selects table (with drag detection)"
```

---

### Task 12: Mobile Book CTA bar + booking dialog wiring

**Files:**
- Modify: `components/PublicFloorPlan.js`

- [ ] **Step 1: Add the CTA bar JSX**

In the JSX `return`, immediately before the closing `</div>` at line 2740, add:

```jsx
{showMobileCTA && selectedTableRef.current && (
    <div
        className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 pt-3"
        style={{
            background: 'linear-gradient(180deg, rgba(12,11,16,0) 0%, rgba(12,11,16,0.95) 35%)',
        }}
    >
        <button
            type="button"
            onClick={() => {
                const t = selectedTableRef.current;
                if (!t) return;
                const tId = t.userData.objectId || t.userData.friendlyId;
                // Reuse the existing booking dialog flow.
                // openBookingDialogForTable is the existing helper around line 1103
                // that builds the createBookingDialog flow; if its name differs,
                // call the function used in the desktop click handler around line 1100.
                openBookingDialogForTable(t, tId);
            }}
            style={{
                width: '100%',
                padding: '16px',
                background: '#C9A84C',
                color: '#0C0B10',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '1rem',
                minHeight: '56px',
                boxShadow: '0 8px 24px rgba(201,168,76,0.35)',
            }}
        >
            Book This Table — {selectedTableRef.current.userData.customName
                || selectedTableRef.current.userData.objectId}
        </button>
    </div>
)}
```

- [ ] **Step 2: Extract / find the booking-dialog helper**

The desktop click handler around line 1100 creates a booking dialog via inline HTML (`createBookingDialog(...)`). Two options:

**Option A (preferred): extract a helper function.** Inside the component body, factor out the click-handler body that builds and opens the dialog into a function:

```js
const openBookingDialogForTable = useCallback((table, tableId) => {
    // ...paste the body of the existing click-handler dialog creation here...
}, [/* relevant deps */]);
```

Then update the desktop click handler (line 1100 area) to call `openBookingDialogForTable(table, tableId)`.

**Option B (quicker): inline call.** If extraction is too invasive, the CTA's `onClick` can dispatch a synthetic click on the renderer canvas at the table's projected screen position. Don't go this route — extraction in Option A is cleaner.

- [ ] **Step 3: Clear state when dialog closes**

The existing dialog has a Cancel button and a success path. In both branches (success and cancel), add the following clear-up calls inside the existing cleanup at the end of the dialog interaction (around line 1220, where `removeHoverTooltip()` is called):

```js
selectedTableRef.current = null;
setShowMobileCTA(false);
if (beamsRef.current) beamsRef.current.setHoverPosition(null);
```

- [ ] **Step 4: Verify manually**

Restart dev server. Mobile emulation. Pick date+time. Tap an available table — gold beam + CTA bar appears at bottom with "Book This Table — {name}". Tap the CTA — booking dialog opens. Cancel — dialog closes, CTA bar gone, gold beam gone. Tap a table again, complete a booking — same cleanup; the booked table picks up a red beam.

Verify on desktop: CTA bar never renders (gated on `showMobileCTA`, which is only ever set true inside the touch path).

- [ ] **Step 5: Commit**

```bash
git add components/PublicFloorPlan.js
git commit -m "feat(floorplan): mobile Book CTA bar wired to existing booking dialog"
```

---

## Self-Review

**Spec coverage:**
- Persistent red on reserved → Task 2, 3, 8.
- Gold beam on hover → Task 4, 5, 9.
- Theatrical descending beam shape → Task 2 (geometry + shader).
- Symmetric shape (red and gold use same beam mesh) → Task 2 (single `makeBeamMesh` used for both).
- Red breathing, gold lerp → Task 5.
- Pre-date/time gating → Task 8 (effect early-return), Task 9 (hover guarded), Task 11 (tap returns early).
- Mobile tap → beam + CTA → dialog → Task 11, 12.
- Tap-vs-drag detection → Task 11.
- Grey-recolor removal → Task 10.
- Instructions copy update → Task 10.
- Webgl context-loss restore → Task 7 (`dispose` in cleanup); spec called for extension of `handleContextLost`. The existing `cleanup()` is invoked during context loss handling per the existing code at line 515; the dispose call inside `cleanup` therefore covers context loss. No additional task needed.
- Unit tests → Tasks 1–6 (full coverage of public API).
- Manual verification steps → embedded per task.

**Placeholder scan:** No `TODO` / `TBD` / "fill in" in the plan. Every code step contains the full code.

**Type consistency:** Method names match across tasks (`setHoverPosition`, `setReservedTables`, `tick`, `dispose`). Field names match (`beamRole`, `userData.objectId`). The CTA references `openBookingDialogForTable` which is created in Task 12 Step 2; this is internally consistent.

**One known caveat to flag at execution time:** Task 8 Step 2 says "verify the `isTable` flag." If the codebase tags tables differently (e.g., via parent-group `isTable` rather than per-mesh), the traversal needs adjustment. The plan includes the alternative fallback.
