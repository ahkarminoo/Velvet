import { chair, table, sofa, roundTable, create2SeaterTable, create8SeaterTable, plant01, plant02, largeFridge, foodStand, drinkStand, iceBox, iceCreamBox } from '../asset.js';

export class SidebarManager {
    constructor(uiManager) {
        this.ui = uiManager;
        this.sidebar = document.getElementById('sidebar');
        this.toggleButton = document.getElementById('sidebar-toggle');
        this.initSidebar();
        this.initObjectLibrary();
    }

    initSidebar() {
        this.toggleButton.addEventListener('click', () => {
            this.sidebar.classList.toggle('active');
            this.toggleButton.classList.toggle('active');
        });
    }

    initObjectLibrary() {
        const librarySections = [
            {
                title: "Furniture",
                icon: "bi-chair",
                items: [
                    {
                        name: "Chair",
                        thumbnail: "/assets/thumbnails/chair.jpg",
                        icon: "bi-chair",
                        action: async () => {
                            const chairModel = await this.ui.createChair();
                            if (chairModel) {
                                chairModel.position.set(0, 0.5, 0);
                                chairModel.userData = {
                                    isChair: true,
                                    isMovable: true,
                                    isRotatable: true
                                };
                            }
                        }
                    },
                    {
                        name: "4 seater Table",
                        thumbnail: "/assets/thumbnails/table.jpg",
                        icon: "bi-table",
                        action: async () => {
                            const tableModel = await this.ui.createTable();
                            if (tableModel) {
                                tableModel.position.set(0, 0.5, 0);
                                tableModel.userData = {
                                    isTable: true,
                                    isMovable: true,
                                    isRotatable: true,
                                    maxCapacity: 4
                                };
                            }
                        }
                    },
                    {
                        name: "Sofa",
                        thumbnail: "/assets/thumbnails/sofa.jpg",
                        icon: "bi-sofa",
                        action: async () => {
                            const sofaModel = await this.ui.createSofa();
                            if (sofaModel) {
                                sofaModel.position.set(0, 0.5, 0);
                                sofaModel.userData = {
                                    isSofa: true,
                                    isMovable: true,
                                    isRotatable: true
                                };
                            }
                        }
                    },
                    {
                        name: "4 seater Round Table",
                        thumbnail: "/assets/thumbnails/roundtable.jpg",
                        icon: "bi-lightbulb",
                        action: async () => {
                            const roundTableModel = await this.ui.createRoundTable();
                            if (roundTableModel) {
                                roundTableModel.position.set(0, 0.5, 0);
                                roundTableModel.userData = {
                                    isTable: true,
                                    isRoundTable: true,
                                    isMovable: true,
                                    isRotatable: true,
                                    maxCapacity: 4
                                };
                            }
                        }
                    },
                    {
                        name: "2 Seater Table",
                        thumbnail: "/assets/thumbnails/table.jpg",
                        icon: "bi-table",
                        action: async () => {
                            const tableModel = await this.ui.create2SeaterTable();
                            if (tableModel) {
                                tableModel.position.set(0, 0.5, 0);
                                tableModel.userData = {
                                    isTable: true,
                                    is2SeaterTable: true,
                                    isMovable: true,
                                    isRotatable: true,
                                    maxCapacity: 2
                                };
                            }
                        }
                    },
                    {
                        name: "8 Seater Table",
                        thumbnail: "/assets/thumbnails/8seater.jpg",
                        icon: "bi-table",
                        action: async () => {
                            const tableModel = await this.ui.create8SeaterTable();
                            if (tableModel) {
                                tableModel.position.set(0, 0.5, 0);
                                tableModel.userData = {
                                    isTable: true,
                                    is8SeaterTable: true,
                                    isMovable: true,
                                    isRotatable: true,
                                    maxCapacity: 8
                                };
                            }
                        }
                    }
                ]
            },
            {
                title: "Decorations",
                icon: "bi-flower1",
                items: [
                    {
                        name: "Plant 1",
                        thumbnail: "/assets/thumbnails/plant1.jpg",
                        icon: "bi-flower1",
                        action: async () => {
                            const plantModel = await this.ui.createPlant01();
                            if (plantModel) {
                                plantModel.position.set(0, 0.5, 0);
                                plantModel.userData = {
                                    isPlant: true,
                                    isPlant01: true,
                                    isMovable: true,
                                    isRotatable: true
                                };
                            }
                        }
                    },
                    {
                        name: "Plant 2",
                        thumbnail: "/assets/thumbnails/plant2.jpg",
                        icon: "bi-flower2",
                        action: async () => {
                            const plantModel = await this.ui.createPlant02();
                            if (plantModel) {
                                plantModel.position.set(0, 0.5, 0);
                                plantModel.userData = {
                                    isPlant: true,
                                    isPlant02: true,
                                    isMovable: true,
                                    isRotatable: true
                                };
                            }
                        }
                    }
                ]
            },
            {
                title: "Restaurant Equipment",
                icon: "bi-box-seam",
                items: [
                    {
                        name: "Large Fridge",
                        thumbnail: "/assets/thumbnails/fridge.jpg",
                        icon: "bi-snow",
                        action: async () => {
                            const fridgeModel = await this.ui.createLargeFridge();
                            if (fridgeModel) {
                                fridgeModel.position.set(0, 0.5, 0);
                                fridgeModel.userData = {
                                    isFridge: true,
                                    isMovable: true,
                                    isRotatable: true,
                                    isRestaurantEquipment: true,
                                    isFurniture: true,
                                    name: 'Large Fridge'
                                };
                            }
                        }
                    },
                    {
                        name: "Food Stand",
                        thumbnail: "/assets/thumbnails/foodstand.jpg",
                        icon: "bi-cup-straw",
                        action: async () => {
                            const foodStandModel = await this.ui.createFoodStand();
                            if (foodStandModel) {
                                foodStandModel.position.set(0, 0.5, 0);
                                foodStandModel.userData = {
                                    isFoodStand: true,
                                    isMovable: true,
                                    isRotatable: true,
                                    isRestaurantEquipment: true,
                                    isFurniture: true, // Add for removal
                                    name: 'Food Stand',
                                    equipmentType: 'foodStand'
                                };
                            }
                        }
                    },
                    {
                        name: "Drink Stand",
                        thumbnail: "/assets/thumbnails/drinkstand.jpg",
                        icon: "bi-cup",
                        action: async () => {
                            const drinkStandModel = await this.ui.createDrinkStand();
                            if (drinkStandModel) {
                                drinkStandModel.position.set(0, 0.5, 0);
                                drinkStandModel.userData = {
                                    isDrinkStand: true,
                                    isMovable: true,
                                    isRotatable: true,
                                    isRestaurantEquipment: true,
                                    isFurniture: true,
                                    name: 'Drink Stand'
                                };
                            }
                        }
                    },
                    {
                        name: "Ice Box",
                        thumbnail: "/assets/thumbnails/icebox.jpg",
                        icon: "bi-snow2",
                        action: async () => {
                            const iceBoxModel = await this.ui.createIceBox();
                            if (iceBoxModel) {
                                iceBoxModel.position.set(0, 0.5, 0);
                                iceBoxModel.userData = {
                                    isIceBox: true,
                                    isMovable: true,
                                    isRotatable: true,
                                    isRestaurantEquipment: true,
                                    isFurniture: true,
                                    name: 'Ice Box'
                                };
                            }
                        }
                    },
                    {
                        name: "Ice Cream Box",
                        thumbnail: "/assets/thumbnails/icecreambox.jpg",
                        icon: "bi-snow3",
                        action: async () => {
                            const iceCreamBoxModel = await this.ui.createIceCreamBox();
                            if (iceCreamBoxModel) {
                                iceCreamBoxModel.position.set(0, 0.5, 0);
                                iceCreamBoxModel.userData = {
                                    isIceCreamBox: true,
                                    isMovable: true,
                                    isRotatable: true,
                                    isRestaurantEquipment: true,
                                    isFurniture: true,
                                    name: 'Ice Cream Box'
                                };
                            }
                        }
                    }
                ]
            },
            {
                title: "Structures",
                icon: "bi-bricks",
                items: [
                    {
                        name: "Wall",
                        thumbnail: "/assets/thumbnails/wall.jpg",
                        icon: "bi-bricks",
                        action: () => {
                            this.ui.wallManager.toggleAddWallMode();
                            this.ui.isRemoveMode = false;
                            this.ui.removeButton.classList.remove("active");
                            document.body.classList.remove("remove-mode");
                        }
                    },
                    {
                        name: "Door",
                        thumbnail: "/assets/thumbnails/door.jpg", 
                        icon: "bi-door-open",
                        action: () => {
                            this.ui.toggleDoorMode(true);
                            this.ui.removeButton.classList.remove("active");
                            document.body.classList.remove("remove-mode");
                        }
                    },
                    {
                        name: "Window",
                        thumbnail: "/assets/thumbnails/window.jpg",
                        icon: "bi-window",
                        action: () => {
                            this.ui.toggleWindowMode(true);
                            this.ui.removeButton.classList.remove("active");
                            document.body.classList.remove("remove-mode");
                        }
                    }
                ]
            }
        ];

        const container = document.getElementById("library-items");
        
        librarySections.forEach(section => {
            const sectionElement = document.createElement("div");
            sectionElement.className = "library-section";
            
            const titleElement = document.createElement("h3");
            titleElement.innerHTML = `<i class="bi ${section.icon}"></i>${section.title}`;
            sectionElement.appendChild(titleElement);

            const gridElement = document.createElement("div");
            gridElement.className = "library-grid";

            section.items.forEach(item => {
                const button = document.createElement("button");
                button.className = "object-btn";
                button.setAttribute('data-tooltip', `Add ${item.name}`);
                button.innerHTML = `
                    <img src="${item.thumbnail}" alt="${item.name}">
                    <span><i class="bi ${item.icon}"></i> ${item.name}</span>
                `;
                button.addEventListener("click", () => {
                    item.action();
                    this.sidebar.classList.remove('active');
                });
                gridElement.appendChild(button);
            });

            sectionElement.appendChild(gridElement);
            container.appendChild(sectionElement);
        });
    }
}