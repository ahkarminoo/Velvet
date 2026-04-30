import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    return scene;
}

export function createFloor(width, height) {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshPhongMaterial({ color: 0x808080 });
    const floor = new THREE.Mesh(geometry, material);

    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;

    // Original grid configuration
    const gridHelper = new THREE.GridHelper(width, width/1, 0x000000, 0x000000);
    gridHelper.rotation.x = Math.PI / 2;
    floor.add(gridHelper);

    return floor;
}
export function initializeOrbitControls(camera, renderer) {
    if (!renderer || !renderer.domElement) {
        console.error('Renderer not properly initialized');
        return null;
    }
    
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2;
    
    return controls;
}