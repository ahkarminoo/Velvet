export class SceneManager {
    constructor() {
        this.API_URL = this.getApiUrl();
        this.scenesGrid = document.getElementById('scenes-grid');
        this.loadingOverlay = document.getElementById('loading-overlay');
    }

    getApiUrl() {
        if (typeof window !== 'undefined') {
            const origin = window.location.origin;
            return `${origin}/api/scenes`;
        }
        return '/api/scenes';
    }

    async loadScenes() {
        try {
            this.showLoading(true);
            const response = await fetch(this.API_URL);
            const scenes = await response.json();
            this.renderScenes(scenes);
        } catch (error) {
            console.error('Failed to load scenes:', error);
        } finally {
            this.showLoading(false);
        }
    }

    renderScenes(scenes) {
        this.scenesGrid.innerHTML = scenes.map(scene => this.createSceneCard(scene)).join('');
        this.addEventListeners();
    }

    createSceneCard(scene) {
        // Count bookable items
        const bookableItems = scene.data.objects.filter(
            obj => obj.userData.isChair || obj.userData.isFurniture
        );

        return `
            <div class="scene-card" data-scene-id="${scene._id}">
                <div class="scene-preview">
                    <!-- Preview will be added later -->
                </div>
                <div class="scene-info">
                    <h3 class="scene-title">${scene.name}</h3>
                    <div class="scene-stats">
                        <span class="stat">
                            <i class="bi bi-chair"></i> ${bookableItems.length} Available
                        </span>
                    </div>
                    <div class="scene-actions">
                        <button class="scene-btn view-btn" data-action="view">
                            <i class="bi bi-eye"></i> View Layout
                        </button>
                        <button class="scene-btn book-btn" data-action="book">
                            <i class="bi bi-calendar-check"></i> Book Items
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    addEventListeners() {
        this.scenesGrid.addEventListener('click', async (e) => {
            const btn = e.target.closest('.scene-btn');
            if (!btn) return;

            const sceneCard = btn.closest('.scene-card');
            const sceneId = sceneCard.dataset.sceneId;
            const action = btn.dataset.action;

            if (action === 'view') {
                this.viewScene(sceneId);
            } else if (action === 'book') {
                await this.showBookingDialog(sceneId);
            }
        });
    }

    viewScene(sceneId) {
        window.location.href = `index.html?scene=${sceneId}&mode=view`;
    }

    async showBookingDialog(sceneId) {
        try {
            const response = await fetch(`${this.API_URL}/${sceneId}`);
            const scene = await response.json();

            // Create and show booking dialog
            const dialog = document.createElement('div');
            dialog.className = 'booking-dialog';
            
            const bookableItems = scene.data.objects.filter(
                obj => obj.userData.isChair || obj.userData.isFurniture
            );

            dialog.innerHTML = `
                <div class="booking-dialog-content">
                    <h2>Select Items to Book</h2>
                    <div class="bookable-items">
                        ${bookableItems.map((item, index) => `
                            <div class="bookable-item ${item.userData.isBooked ? 'booked' : ''}" 
                                 data-item-index="${index}">
                                <i class="bi ${item.userData.isChair ? 'bi-chair' : 'bi-table'}"></i>
                                <span>${item.userData.isChair ? 'Chair' : 'Table'} ${index + 1}</span>
                                <button class="book-item-btn" ${item.userData.isBooked ? 'disabled' : ''}>
                                    ${item.userData.isBooked ? 'Booked' : 'Book'}
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    <div class="dialog-actions">
                        <button class="close-dialog">Close</button>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            // Add event listeners for booking items
            dialog.addEventListener('click', async (e) => {
                if (e.target.classList.contains('close-dialog')) {
                    document.body.removeChild(dialog);
                } else if (e.target.classList.contains('book-item-btn')) {
                    const itemDiv = e.target.closest('.bookable-item');
                    const itemIndex = parseInt(itemDiv.dataset.itemIndex);
                    await this.bookItem(sceneId, bookableItems[itemIndex], itemDiv);
                }
            });

        } catch (error) {
            console.error('Failed to show booking dialog:', error);
            alert('Failed to load booking options');
        }
    }

    async bookItem(sceneId, item, itemDiv) {
        try {
            // Mark the item as booked
            item.userData.isBooked = true;
            item.userData.bookingTime = new Date().toISOString();

            // Update the UI
            itemDiv.classList.add('booked');
            const btn = itemDiv.querySelector('.book-item-btn');
            btn.textContent = 'Booked';
            btn.disabled = true;

            // Save the updated scene
            await fetch(`${this.API_URL}/${sceneId}/book`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ itemId: item.id })
            });

        } catch (error) {
            console.error('Booking failed:', error);
            alert('Failed to book item');
        }
    }

    showLoading(show) {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.toggle('active', show);
        }
    }
}