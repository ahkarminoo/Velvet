import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as THREE from 'three';

// Module-level cache (persists for lifetime of browser tab)
const modelCache = new Map();

async function loadCached(path) {
    let cached = modelCache.get(path);

    if (!cached) {
        const loader = new OBJLoader();
        cached = loader.loadAsync(path)
            .then((template) => template)
            .catch((err) => {
                // Allow retries if the first load failed
                modelCache.delete(path);
                throw err;
            });

        modelCache.set(path, cached);
    }

    const template = await cached;
    const clone = template.clone(true);

    // Ensure per-instance materials (so color/userData changes don't leak)
    clone.traverse((child) => {
        if (child && child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
                child.material = child.material.map((m) => (m && m.clone ? m.clone() : m));
            } else if (child.material.clone) {
                child.material = child.material.clone();
            }
        }
    });

    return clone;
}

export async function chair(scene) {
    try {
        const group = await loadCached('/models/chair/chair/3SM.obj');
        if (group.children.length > 0) {
            const material = new THREE.MeshPhongMaterial({
                color: 0xffffff,
                shininess: 30
            });
            group.children.forEach(child => {
                if (child.isMesh) {
                    child.material = material;
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.scale.set(0.01, 0.01, 0.01);
                }
            });
            group.position.set(0, 0.01, 0);
            group.userData = {
                isMovable: true,
                isChair: true,
                isRotatable: true
            };
            scene.add(group);
        }
        return group;
    } catch (error) {
        console.error("Error loading chair:", error);
        return null;
    }
}

export async function table(scene) {
    try {
        const group = await loadCached('/models/table/ractangleTable/Table.obj');
        if (group.children.length > 0) {
            const material = new THREE.MeshPhongMaterial({
                color: 0xffffff,
                shininess: 30
            });
            group.children.forEach(child => {
                if (child.isMesh) {
                    child.material = material;
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.scale.set(0.01, 0.01, 0.01);
                }
            });
            group.position.set(0, 0.01, 0);
            group.userData = {
                isMovable: true,
                isTable: true,
                isRotatable: true,
                maxCapacity: 4,
            };
            scene.add(group);
        }
        return group;
    } catch (error) {
        console.error("Error loading table:", error);
        return null;
    }
}

export async function sofa(scene) {
    try {
        const group = await loadCached('/models/chair/couch/couch.obj');
        if (group.children.length > 0) {
            const material = new THREE.MeshPhongMaterial({
                color: 0xffffff,
                shininess: 30
            });
            group.children.forEach(child => {
                if (child.isMesh) {
                    child.material = material;
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.scale.set(1, 1, 1);
                }
            });
            group.position.set(0, 0.01, 0);
            group.userData = {
                isMovable: true,
                isSofa: true,
                isRotatable: true,
                maxCapacity: 2,
                isTable: false
            };
            scene.add(group);
        }
        return group;
    } catch (error) {
        console.error("Error loading sofa:", error);
        return null;
    }
}

export async function roundTable(scene) {
    try {
        const group = await loadCached('/models/table/roundTable/roundTable.obj');
        if (group.children.length > 0) {
            const material = new THREE.MeshPhongMaterial({
                color: 0xffffff,
                shininess: 30
            });
            group.children.forEach(child => {
                if (child.isMesh) {
                    child.material = material;
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.scale.set(0.03, 0.03, 0.03);
                }
            });
            group.position.set(0, 0.01, 0);
            group.rotation.set(Math.PI / 2, Math.PI, 0);
            group.userData = {
                isMovable: true,
                isTable: true,
                isRotatable: true,
                isRoundTable: true,
                maxCapacity: 4,
            };
            scene.add(group);
        }
        return group;
    } catch (error) {
        console.error("Error loading roundTable:", error);
        return null;
    }
}

export async function create2SeaterTable(scene) {
    try {
        const group = await loadCached('/models/table/2seater_squareTable/3d-model.obj');
        if (group.children.length > 0) {
            const material = new THREE.MeshPhongMaterial({
                color: 0xffffff,
                shininess: 30
            });
            group.children.forEach(child => {
                if (child.isMesh) {
                    child.material = material;
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.scale.set(0.02, 0.02, 0.02);
                }
            });
            group.position.set(0, 0.01, 0);
            group.userData = {
                isMovable: true,
                isTable: true,
                isRotatable: true,
                is2SeaterTable: true,
                maxCapacity: 2,
            };
            scene.add(group);
        }
        return group;
    } catch (error) {
        console.error("Error loading 2 seater table:", error);
        return null;
    }
}

export async function create8SeaterTable(scene) {
    try {
        const group = await loadCached('/models/table/6seater_roundtable/6seaterRound.obj');
        if (group.children.length > 0) {
            const material = new THREE.MeshPhongMaterial({
                color: 0xffffff,
                shininess: 30
            });
            group.children.forEach(child => {
                if (child.isMesh) {
                    child.material = material;
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.scale.set(0.03, 0.03, 0.03);
                }
            });
            group.position.set(0, 0.01, 0);
            group.userData = {
                isMovable: true,
                isTable: true,
                isRotatable: true,
                is8SeaterTable: true,
                maxCapacity: 8,
            };
            scene.add(group);
        }
        return group;
    } catch (error) {
        console.error("Error loading 8 seater table:", error);
        return null;
    }
}

export async function plant01(scene){
    console.log("Starting to load plant01 model...");
    try {
        console.log("Loading from path:", '/models/decorations/indoorPlants/vase01.obj');
        const group = await loadCached('/models/decorations/indoorPlants/vase01.obj');
        console.log("Plant01 model loaded, children count:", group.children.length);
        if (group.children.length > 0) {
            // Create different materials for different parts
            const materials = {
                vase_01_corona_001: new THREE.MeshPhongMaterial({
                    color: 0x964B00,  // Forest green for first part
                    shininess: 30
                }),
                vase_01_corona_002: new THREE.MeshPhongMaterial({
                    color: 0x654321,  // vase  
                    shininess: 30
                }),
                vase_01_corona_003: new THREE.MeshPhongMaterial({
                    color: 0xCD7F32,  //plant vase base 
                    shininess: 30
                }),
                vase_01_corona_004: new THREE.MeshPhongMaterial({
                    color: 0x90EE90,  // leaf
                    shininess: 30
                })
            };

            console.log("Applying materials to plant01 meshes...");
            group.children.forEach(child => {
                if (child.isMesh) {
                    // Assign material based on mesh name
                    child.material = materials[child.name] || materials.vase_01_corona_004;
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.scale.set(0.01, 0.01, 0.01);
                    console.log("Applied material to mesh:", child.name);
                }
            });
            
            group.position.set(0, 0.01, 0);
            group.userData = {
                isMovable: true,
                isPlant: true,
                isPlant01: true,
                isRotatable: true,
            };
            console.log("Plant01 model processed successfully");
            scene.add(group);
            return group;
        }   
        console.warn("Plant01 model loaded but has no children");
        return null;
    } catch (error) {
        console.error("Error loading plant01:", error);
        return null;
    }
}
export async function plant02(scene){
    console.log("Starting to load plant02 model...");
    try {
        console.log("Loading from path:", '/models/decorations/indoorPlants/vase02.obj');
        const group = await loadCached('/models/decorations/indoorPlants/vase02.obj');
        console.log("Plant02 model loaded, children count:", group.children.length);
        
        if (group.children.length > 0) {
            // Create separate materials for leaves and pot
            const leavesMaterial = new THREE.MeshPhongMaterial({
                color: 0x2D5A27,  // Dark green for leaves
                shininess: 30
            });
            
            const potMaterial = new THREE.MeshPhongMaterial({
                color: 0xC04000,  // Terracotta color for pot
                shininess: 30
            });
            const stemsMaterial = new THREE.MeshPhongMaterial({
                color: 0xC4A484,  //  for stems
                shininess: 30
            });

            console.log("Applying materials to plant02 meshes...");
            group.children.forEach(child => {
                if (child.isMesh) {
                    // Apply different materials based on mesh name
                    if (child.name === "Leaves") {
                        child.material = leavesMaterial;
                    } else if (child.name === "Pot") {
                        child.material = potMaterial;
                    }else if(child.name === "Stems"){
                        child.material = stemsMaterial;
                    }

                    
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.scale.set(0.001, 0.001, 0.001);
                    console.log("Applied material to mesh:", child.name);
                }
            });
            
            group.position.set(0, 0.01, 0);
            group.userData = {
                isMovable: true,
                isPlant: true,
                isPlant02: true,
                isRotatable: true,
            };
            console.log("Plant02 model processed successfully");
            scene.add(group);
            return group;
        }
        console.warn("Plant02 model loaded but has no children");
        return null;
    } catch (error) {
        console.error("Error loading plant02:", error);
        return null;
    }
}

// Restaurant Equipment Assets

export function largeFridge(scene) {
    const group = new THREE.Group();
    
    // Main fridge body
    const fridgeGeometry = new THREE.BoxGeometry(1.2, 2.0, 0.6);
    const fridgeMaterial = new THREE.MeshPhongMaterial({
        color: 0xE5E5E5, // Stainless steel color
        shininess: 100
    });
    const fridgeBody = new THREE.Mesh(fridgeGeometry, fridgeMaterial);
    fridgeBody.position.set(0, 1.0, 0);
    fridgeBody.castShadow = true;
    fridgeBody.receiveShadow = true;
    
    // Fridge door handle
    const handleGeometry = new THREE.BoxGeometry(0.05, 0.3, 0.05);
    const handleMaterial = new THREE.MeshPhongMaterial({
        color: 0x333333,
        shininess: 50
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0.5, 1.0, 0.32);
    
    // Door lines/divisions
    const lineGeometry = new THREE.BoxGeometry(1.0, 0.02, 0.01);
    const lineMaterial = new THREE.MeshPhongMaterial({
        color: 0xCCCCCC,
        shininess: 80
    });
    const doorLine = new THREE.Mesh(lineGeometry, lineMaterial);
    doorLine.position.set(0, 1.0, 0.31);
    
    group.add(fridgeBody);
    group.add(handle);
    group.add(doorLine);
    
    group.position.set(0, 0.01, 0);
    group.userData = {
        isMovable: true,
        isRotatable: true,
        isFridge: true,
        isRestaurantEquipment: true,
        isFurniture: true, // Add for removal
        name: 'Large Fridge'
    };
    
    scene.add(group);
    return group;
}

export function foodStand(scene) {
    const group = new THREE.Group();
    
    // Rectangular table base (like a buffet table)
    const tableGeometry = new THREE.BoxGeometry(1.2, 0.8, 0.6);
    const tableMaterial = new THREE.MeshPhongMaterial({
        color: 0x8B4513, // Brown wood color
        shininess: 30
    });
    const tableBase = new THREE.Mesh(tableGeometry, tableMaterial);
    tableBase.position.set(0, 0.4, 0);
    tableBase.castShadow = true;
    tableBase.receiveShadow = true;
    
    // Table legs
    const legGeometry = new THREE.BoxGeometry(0.05, 0.8, 0.05);
    const legMaterial = new THREE.MeshPhongMaterial({
        color: 0x654321,
        shininess: 20
    });
    
    // Four table legs
    const positions = [
        [-0.55, 0.4, -0.25],
        [0.55, 0.4, -0.25],
        [-0.55, 0.4, 0.25],
        [0.55, 0.4, 0.25]
    ];
    
    positions.forEach(pos => {
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        leg.position.set(pos[0], pos[1], pos[2]);
        leg.castShadow = true;
        group.add(leg);
    });
    
    // Food display surface
    const surfaceGeometry = new THREE.BoxGeometry(1.15, 0.05, 0.55);
    const surfaceMaterial = new THREE.MeshPhongMaterial({
        color: 0xFFFFFF,
        shininess: 80
    });
    const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
    surface.position.set(0, 0.825, 0);
    surface.castShadow = true;
    surface.receiveShadow = true;
    
    group.add(tableBase);
    group.add(surface);
    
    group.position.set(0, 0.01, 0);
    group.userData = {
        isMovable: true,
        isRotatable: true,
        isFoodStand: true,
        isRestaurantEquipment: true,
        isFurniture: true, // Add this for removal
        name: 'Food Stand',
        equipmentType: 'foodStand'
    };
    
    scene.add(group);
    return group;
}

export function drinkStand(scene) {
    const group = new THREE.Group();
    
    // Base cabinet
    const cabinetGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.4);
    const cabinetMaterial = new THREE.MeshPhongMaterial({
        color: 0x8B4513, // Brown wood color
        shininess: 20
    });
    const cabinet = new THREE.Mesh(cabinetGeometry, cabinetMaterial);
    cabinet.position.set(0, 0.4, 0);
    cabinet.castShadow = true;
    cabinet.receiveShadow = true;
    
    // Glass dispensers
    const dispenserGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.4);
    const dispenserMaterial = new THREE.MeshPhongMaterial({
        color: 0x87CEEB,
        opacity: 0.7,
        transparent: true,
        shininess: 100
    });
    
    const dispenser1 = new THREE.Mesh(dispenserGeometry, dispenserMaterial);
    dispenser1.position.set(-0.2, 1.0, 0);
    
    const dispenser2 = new THREE.Mesh(dispenserGeometry, dispenserMaterial);
    dispenser2.position.set(0.2, 1.0, 0);
    
    // Tap/spouts
    const tapGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.1);
    const tapMaterial = new THREE.MeshPhongMaterial({
        color: 0x333333,
        shininess: 50
    });
    
    const tap1 = new THREE.Mesh(tapGeometry, tapMaterial);
    tap1.position.set(-0.2, 0.8, 0.15);
    
    const tap2 = new THREE.Mesh(tapGeometry, tapMaterial);
    tap2.position.set(0.2, 0.8, 0.15);
    
    group.add(cabinet);
    group.add(dispenser1);
    group.add(dispenser2);
    group.add(tap1);
    group.add(tap2);
    
    group.position.set(0, 0.01, 0);
    group.userData = {
        isMovable: true,
        isRotatable: true,
        isDrinkStand: true,
        isRestaurantEquipment: true,
        isFurniture: true, // Add for removal
        name: 'Drink Stand'
    };
    
    scene.add(group);
    return group;
}

export function iceBox(scene) {
    const group = new THREE.Group();
    
    // Main ice box body
    const boxGeometry = new THREE.BoxGeometry(1.0, 0.8, 0.6);
    const boxMaterial = new THREE.MeshPhongMaterial({
        color: 0xF0F8FF, // Alice blue for ice box
        shininess: 60
    });
    const iceBoxBody = new THREE.Mesh(boxGeometry, boxMaterial);
    iceBoxBody.position.set(0, 0.4, 0);
    iceBoxBody.castShadow = true;
    iceBoxBody.receiveShadow = true;
    
    // Ice box lid
    const lidGeometry = new THREE.BoxGeometry(1.05, 0.1, 0.65);
    const lidMaterial = new THREE.MeshPhongMaterial({
        color: 0xE6F3FF,
        shininess: 70
    });
    const lid = new THREE.Mesh(lidGeometry, lidMaterial);
    lid.position.set(0, 0.85, 0);
    lid.castShadow = true;
    
    // Handle on lid
    const handleGeometry = new THREE.BoxGeometry(0.2, 0.05, 0.05);
    const handleMaterial = new THREE.MeshPhongMaterial({
        color: 0x333333,
        shininess: 40
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, 0.92, 0.2);
    
    group.add(iceBoxBody);
    group.add(lid);
    group.add(handle);
    
    group.position.set(0, 0.01, 0);
    group.userData = {
        isMovable: true,
        isRotatable: true,
        isIceBox: true,
        isRestaurantEquipment: true,
        isFurniture: true, // Add for removal
        name: 'Ice Box'
    };
    
    scene.add(group);
    return group;
}

// ─── Bar & Club Assets ────────────────────────────────────────────────────────

export function barCounter(scene) {
    const group = new THREE.Group();
    // Main counter body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.1, 0.7),
        new THREE.MeshPhongMaterial({ color: 0x1A0A00, shininess: 80 })
    );
    body.position.set(0, 0.55, 0);
    body.castShadow = true;
    // Counter top (marble look)
    const top = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.08, 0.8),
        new THREE.MeshPhongMaterial({ color: 0xE8E0D8, shininess: 120 })
    );
    top.position.set(0, 1.14, 0);
    // Gold trim strip
    const trim = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.04, 0.02),
        new THREE.MeshPhongMaterial({ color: 0xC9A84C, shininess: 150, emissive: 0xC9A84C, emissiveIntensity: 0.1 })
    );
    trim.position.set(0, 1.1, 0.4);
    // Back shelf
    const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.6, 0.3),
        new THREE.MeshPhongMaterial({ color: 0x120800, shininess: 60 })
    );
    shelf.position.set(0, 0.8, -0.5);
    // Bottles on shelf
    for (let i = -1; i <= 1; i++) {
        const bottle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.35, 8),
            new THREE.MeshPhongMaterial({ color: i === 0 ? 0x8B4513 : 0x2E4057, shininess: 100, opacity: 0.85, transparent: true })
        );
        bottle.position.set(i * 0.35, 1.45, -0.5);
        group.add(bottle);
    }
    group.add(body, top, trim, shelf);
    group.position.set(0, 0.01, 0);
    group.userData = {
        isMovable: true, isRotatable: true, isBarCounter: true,
        isFurniture: true, name: 'Bar Counter'
    };
    scene.add(group);
    return group;
}

export function djBooth(scene) {
    const group = new THREE.Group();
    // Main booth platform
    const platform = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.9, 1.0),
        new THREE.MeshPhongMaterial({ color: 0x0A0A14, shininess: 60 })
    );
    platform.position.set(0, 0.45, 0);
    platform.castShadow = true;
    // Console surface
    const console = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.06, 0.9),
        new THREE.MeshPhongMaterial({ color: 0x1A1A2E, shininess: 80 })
    );
    console.position.set(0, 0.93, 0);
    // Mixer unit (center)
    const mixer = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.08, 0.5),
        new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 100 })
    );
    mixer.position.set(0, 1.01, 0);
    // Turntable left
    const tt1 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.04, 24),
        new THREE.MeshPhongMaterial({ color: 0x222222, shininess: 120 })
    );
    tt1.position.set(-0.55, 1.01, 0);
    // Turntable right
    const tt2 = tt1.clone();
    tt2.position.set(0.55, 1.01, 0);
    // LED strip (front)
    const led = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.05, 0.04),
        new THREE.MeshPhongMaterial({ color: 0x7C3AED, emissive: 0x7C3AED, emissiveIntensity: 0.8, shininess: 0 })
    );
    led.position.set(0, 0.7, 0.52);
    group.add(platform, console, mixer, tt1, tt2, led);
    group.position.set(0, 0.01, 0);
    group.userData = {
        isMovable: true, isRotatable: true, isDJBooth: true,
        isFurniture: true, name: 'DJ Booth'
    };
    scene.add(group);
    return group;
}

export function stage(scene) {
    const group = new THREE.Group();
    // Stage platform
    const platform = new THREE.Mesh(
        new THREE.BoxGeometry(3.0, 0.35, 2.0),
        new THREE.MeshPhongMaterial({ color: 0x2A1A08, shininess: 40 })
    );
    platform.position.set(0, 0.175, 0);
    platform.castShadow = true;
    platform.receiveShadow = true;
    // Stage edge trim
    const edgeFront = new THREE.Mesh(
        new THREE.BoxGeometry(3.05, 0.04, 0.04),
        new THREE.MeshPhongMaterial({ color: 0xC9A84C, emissive: 0xC9A84C, emissiveIntensity: 0.3 })
    );
    edgeFront.position.set(0, 0.35, 1.02);
    // Steps
    const step1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.12, 0.3),
        new THREE.MeshPhongMaterial({ color: 0x1E1008 })
    );
    step1.position.set(0, 0.06, 1.15);
    const step2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.23, 0.3),
        new THREE.MeshPhongMaterial({ color: 0x1E1008 })
    );
    step2.position.set(0, 0.115, 1.45);
    group.add(platform, edgeFront, step1, step2);
    group.position.set(0, 0.01, 0);
    group.userData = {
        isMovable: true, isRotatable: true, isStage: true,
        isFurniture: true, name: 'Stage'
    };
    scene.add(group);
    return group;
}

export function vipBooth(scene) {
    const group = new THREE.Group();
    // Back cushion (curved via box)
    const back = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 0.8, 0.25),
        new THREE.MeshPhongMaterial({ color: 0x4A0E2E, shininess: 30 })
    );
    back.position.set(0, 0.65, -0.6);
    // Seat
    const seat = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 0.18, 0.8),
        new THREE.MeshPhongMaterial({ color: 0x5C1238, shininess: 20 })
    );
    seat.position.set(0, 0.32, -0.2);
    // Left arm
    const armL = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.45, 0.85),
        new THREE.MeshPhongMaterial({ color: 0x3A0A20 })
    );
    armL.position.set(-1.0, 0.52, -0.2);
    // Right arm
    const armR = armL.clone();
    armR.position.set(1.0, 0.52, -0.2);
    // Table in front
    const tableTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 0.06, 24),
        new THREE.MeshPhongMaterial({ color: 0xC9A84C, shininess: 120 })
    );
    tableTop.position.set(0, 0.72, 0.4);
    const tableLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.06, 0.7, 12),
        new THREE.MeshPhongMaterial({ color: 0x8B7340 })
    );
    tableLeg.position.set(0, 0.35, 0.4);
    group.add(back, seat, armL, armR, tableTop, tableLeg);
    group.position.set(0, 0.01, 0);
    group.userData = {
        isMovable: true, isRotatable: true, isVIPBooth: true,
        isTable: true, maxCapacity: 4,
        isFurniture: true, name: 'VIP Booth'
    };
    scene.add(group);
    return group;
}

export function barStool(scene) {
    const group = new THREE.Group();
    const seat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.06, 16),
        new THREE.MeshPhongMaterial({ color: 0x2A1A08, shininess: 60 })
    );
    seat.position.set(0, 0.75, 0);
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.72, 8),
        new THREE.MeshPhongMaterial({ color: 0xC9A84C, shininess: 100 })
    );
    pole.position.set(0, 0.36, 0);
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16),
        new THREE.MeshPhongMaterial({ color: 0x888888 })
    );
    base.position.set(0, 0.02, 0);
    group.add(seat, pole, base);
    group.position.set(0, 0.01, 0);
    group.userData = {
        isMovable: true, isRotatable: true, isBarStool: true,
        isChair: true, isFurniture: true, name: 'Bar Stool'
    };
    scene.add(group);
    return group;
}

export function cocktailTable(scene) {
    const group = new THREE.Group();
    const top = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.05, 20),
        new THREE.MeshPhongMaterial({ color: 0xC9A84C, shininess: 120 })
    );
    top.position.set(0, 1.02, 0);
    const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.05, 1.0, 10),
        new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 80 })
    );
    stem.position.set(0, 0.5, 0);
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.04, 16),
        new THREE.MeshPhongMaterial({ color: 0x555555 })
    );
    base.position.set(0, 0.02, 0);
    group.add(top, stem, base);
    group.position.set(0, 0.01, 0);
    group.userData = {
        isMovable: true, isRotatable: true, isCocktailTable: true,
        isTable: true, maxCapacity: 4, isFurniture: true, name: 'Cocktail Table'
    };
    scene.add(group);
    return group;
}

export function loungeChair(scene) {
    const group = new THREE.Group();
    // Low seat
    const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.22, 0.7),
        new THREE.MeshPhongMaterial({ color: 0x1A0A28, shininess: 20 })
    );
    seat.position.set(0, 0.22, 0);
    // Reclined back
    const back = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.5, 0.12),
        new THREE.MeshPhongMaterial({ color: 0x220E36, shininess: 20 })
    );
    back.position.set(0, 0.52, -0.3);
    back.rotation.x = -0.2;
    // Legs
    for (const [x, z] of [[-0.32, -0.3], [0.32, -0.3], [-0.32, 0.3], [0.32, 0.3]]) {
        const leg = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.15, 0.04),
            new THREE.MeshPhongMaterial({ color: 0xC9A84C })
        );
        leg.position.set(x, 0.075, z);
        group.add(leg);
    }
    group.add(seat, back);
    group.position.set(0, 0.01, 0);
    group.userData = {
        isMovable: true, isRotatable: true, isLoungeChair: true,
        isChair: true, isFurniture: true, name: 'Lounge Chair'
    };
    scene.add(group);
    return group;
}

export function poolTable(scene) {
    const group = new THREE.Group();
    // Table body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.85, 1.2),
        new THREE.MeshPhongMaterial({ color: 0x2C1A0E, shininess: 40 })
    );
    body.position.set(0, 0.425, 0);
    body.castShadow = true;
    // Felt surface
    const felt = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 0.04, 1.0),
        new THREE.MeshPhongMaterial({ color: 0x1A6B35, shininess: 10 })
    );
    felt.position.set(0, 0.87, 0);
    // Rails
    const railMat = new THREE.MeshPhongMaterial({ color: 0x5C3317, shininess: 60 });
    const rails = [
        [2.2, 0.08, 0.1, 0, 0.87, -0.55],
        [2.2, 0.08, 0.1, 0, 0.87, 0.55],
        [0.1, 0.08, 1.0, -1.1, 0.87, 0],
        [0.1, 0.08, 1.0, 1.1, 0.87, 0]
    ];
    rails.forEach(([w, h, d, x, y, z]) => {
        const r = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), railMat);
        r.position.set(x, y, z);
        group.add(r);
    });
    group.add(body, felt);
    group.position.set(0, 0.01, 0);
    group.userData = {
        isMovable: true, isRotatable: true, isPoolTable: true,
        isFurniture: true, name: 'Pool Table'
    };
    scene.add(group);
    return group;
}

export function iceCreamBox(scene) {
    const group = new THREE.Group();
    
    // Main freezer body
    const freezerGeometry = new THREE.BoxGeometry(1.5, 1.0, 0.8);
    const freezerMaterial = new THREE.MeshPhongMaterial({
        color: 0xFFFFFF,
        shininess: 90
    });
    const freezerBody = new THREE.Mesh(freezerGeometry, freezerMaterial);
    freezerBody.position.set(0, 0.5, 0);
    freezerBody.castShadow = true;
    freezerBody.receiveShadow = true;
    
    // Glass top cover
    const glassGeometry = new THREE.BoxGeometry(1.4, 0.05, 0.7);
    const glassMaterial = new THREE.MeshPhongMaterial({
        color: 0x87CEEB,
        opacity: 0.3,
        transparent: true,
        shininess: 100
    });
    const glassTop = new THREE.Mesh(glassGeometry, glassMaterial);
    glassTop.position.set(0, 1.025, 0);
    
    // Freezer compartment divisions
    const dividerGeometry = new THREE.BoxGeometry(0.02, 0.8, 0.7);
    const dividerMaterial = new THREE.MeshPhongMaterial({
        color: 0xE5E5E5,
        shininess: 50
    });
    
    const divider1 = new THREE.Mesh(dividerGeometry, dividerMaterial);
    divider1.position.set(-0.4, 0.5, 0);
    
    const divider2 = new THREE.Mesh(dividerGeometry, dividerMaterial);
    divider2.position.set(0.4, 0.5, 0);
    
    // Brand/display panel
    const panelGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.02);
    const panelMaterial = new THREE.MeshPhongMaterial({
        color: 0x4169E1,
        shininess: 80
    });
    const displayPanel = new THREE.Mesh(panelGeometry, panelMaterial);
    displayPanel.position.set(0, 0.8, 0.41);
    
    group.add(freezerBody);
    group.add(glassTop);
    group.add(divider1);
    group.add(divider2);
    group.add(displayPanel);
    
    group.position.set(0, 0.01, 0);
    group.userData = {
        isMovable: true,
        isRotatable: true,
        isIceCreamBox: true,
        isRestaurantEquipment: true,
        isFurniture: true, // Add for removal
        name: 'Ice Cream Box'
    };
    
    scene.add(group);
    return group;
}       

