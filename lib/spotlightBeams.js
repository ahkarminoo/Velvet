import * as THREE from 'three';

const BEAM_HEIGHT = 14;
const BEAM_RADIUS_TOP = 0.18;
const BEAM_RADIUS_BOTTOM = 0.85;
const DISC_RADIUS = 0.9;
const GOLD_LERP_RATE = 12;

const GOLD = new THREE.Color(0xc9a84c);
const RED = new THREE.Color(0xff3838);

const beamVertex = /* glsl */ `
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

const beamFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
void main() {
    // The visible beam needs to read as a continuous column of light reaching
    // from somewhere overhead down to the table — not an orb with a thin trail.
    // Keep most of the length bright; only the very top of the cone fades to
    // suggest the light source is offscreen above.
    float v = 1.0 - vUv.y;             // 0 at apex, 1 at base
    float vertical = pow(v, 0.22);     // very gentle falloff toward the top
    float bottomBoost = smoothstep(0.0, 0.35, v); // hide a tiny seam at the apex

    // Volumetric look — silhouette edges (grazing view) are denser, but the
    // body is filled too so the beam looks like a solid column of light.
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float facing = abs(dot(viewDir, vWorldNormal));
    float edge = pow(1.0 - facing, 1.4);
    float core = 0.85;
    float volume = clamp(core + edge * 0.75, 0.0, 1.6);

    float alpha = vertical * bottomBoost * volume * uIntensity * 0.75;

    // Brighten/whiten gently toward the puddle of light where the beam meets the table.
    vec3 tint = mix(uColor, vec3(1.0), pow(v, 3.0) * 0.30);
    tint *= 1.0 + v * 0.25;
    gl_FragColor = vec4(tint, alpha);
}
`;

const discVertex = /* glsl */ `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const discFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;
void main() {
    vec2 centered = vUv - 0.5;
    float r = length(centered) * 2.0;
    // Soft puddle of light — gentler than before, no blown-out hot center.
    float a = pow(max(0.0, 1.0 - r), 1.6) * uIntensity * 0.7;
    vec3 hot = mix(uColor, vec3(1.0), pow(max(0.0, 1.0 - r), 5.0) * 0.30);
    gl_FragColor = vec4(hot, a);
}
`;

function makeBeamMesh(color) {
    // CylinderGeometry — not ConeGeometry. THREE.ConeGeometry's signature is
    // (radius, height, ...) with a single radius (apex at 0, base at radius),
    // which silently mangled the call when we passed two radii to it.
    // CylinderGeometry takes (radiusTop, radiusBottom, height, ...) so we get
    // a proper truncated cone descending from a narrow apex to a wide base.
    const coneGeo = new THREE.CylinderGeometry(
        BEAM_RADIUS_TOP,
        BEAM_RADIUS_BOTTOM,
        BEAM_HEIGHT,
        48,
        1,
        true,
    );
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
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.userData.beamRole = 'cone';

    const discGeo = new THREE.CircleGeometry(DISC_RADIUS, 48);
    discGeo.rotateX(-Math.PI / 2);
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

function placeBeam(beam, tablePos) {
    const tableTopY = tablePos.y + 0.4;
    beam.cone.position.set(tablePos.x, tableTopY + BEAM_HEIGHT / 2, tablePos.z);
    beam.disc.position.set(tablePos.x, tableTopY + 0.02, tablePos.z);
}

function setBeamIntensity(beam, value) {
    beam.cone.material.uniforms.uIntensity.value = value;
    beam.disc.material.uniforms.uIntensity.value = value;
}

function addBeamToScene(scene, beam) {
    scene.add(beam.cone);
    scene.add(beam.disc);
}

function removeBeamFromScene(scene, beam) {
    scene.remove(beam.cone);
    scene.remove(beam.disc);
}

function disposeBeam(beam) {
    beam.cone.geometry.dispose();
    beam.cone.material.dispose();
    beam.disc.geometry.dispose();
    beam.disc.material.dispose();
}

export function createSpotlightBeams({ scene }) {
    const redBeams = new Map();
    const gold = makeBeamMesh(GOLD);
    addBeamToScene(scene, gold);

    let hoverTarget = null;
    let clock = 0;

    return {
        setHoverPosition(tableMesh) {
            if (tableMesh) {
                hoverTarget = tableMesh.position.clone();
                placeBeam(gold, hoverTarget);
            } else {
                hoverTarget = null;
            }
        },

        setReservedTables(tableMap, ids) {
            const wanted = new Set(ids);
            for (const [id, beam] of redBeams) {
                if (!wanted.has(id)) {
                    removeBeamFromScene(scene, beam);
                    disposeBeam(beam);
                    redBeams.delete(id);
                }
            }
            for (const id of wanted) {
                if (redBeams.has(id)) continue;
                const table = tableMap.get(id);
                if (!table) continue;
                const beam = makeBeamMesh(RED);
                placeBeam(beam, table.position);
                setBeamIntensity(beam, 1);
                addBeamToScene(scene, beam);
                redBeams.set(id, beam);
            }
        },

        tick(dt) {
            clock += dt;
            const target = hoverTarget ? 1 : 0;
            const k = Math.min(1, GOLD_LERP_RATE * dt);
            const u = gold.cone.material.uniforms.uIntensity;
            u.value = u.value + (target - u.value) * k;
            gold.disc.material.uniforms.uIntensity.value = u.value;
            if (hoverTarget) {
                gold.cone.position.x += (hoverTarget.x - gold.cone.position.x) * k;
                gold.cone.position.z += (hoverTarget.z - gold.cone.position.z) * k;
                gold.disc.position.x = gold.cone.position.x;
                gold.disc.position.z = gold.cone.position.z;
            }
            const breath = 0.85 + 0.15 * Math.sin(clock * 1.5);
            for (const beam of redBeams.values()) {
                setBeamIntensity(beam, breath);
                beam.cone.material.uniforms.uTime.value = clock;
            }
        },

        dispose() {
            for (const beam of redBeams.values()) {
                removeBeamFromScene(scene, beam);
                disposeBeam(beam);
            }
            redBeams.clear();
            removeBeamFromScene(scene, gold);
            disposeBeam(gold);
            hoverTarget = null;
        },
    };
}
