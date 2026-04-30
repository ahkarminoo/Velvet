import * as THREE from 'three';

export function createRaycaster(event, camera, domElement) {
    const rect = domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    return raycaster;
}

export function getIntersectionPoint(event, camera, floor, domElement) {
    const raycaster = createRaycaster(event, camera, domElement);
    const intersects = raycaster.intersectObject(floor, true);
    return intersects.length > 0 ? intersects[0].point : null;
}