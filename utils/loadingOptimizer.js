// Loading Optimizer for smooth 3D scene loading
class LoadingOptimizer {
  constructor() {
    this.assetCache = new Map();
    this.loadingPromises = new Map();
    this.progressCallbacks = [];
  }

  // Preload critical assets
  async preloadAssets(assets) {
    const promises = assets.map(asset => this.preloadAsset(asset));
    return Promise.all(promises);
  }

  // Preload individual asset
  async preloadAsset(url) {
    if (this.assetCache.has(url)) {
      return this.assetCache.get(url);
    }

    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url);
    }

    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.assetCache.set(url, img);
        this.loadingPromises.delete(url);
        this.updateProgress();
        resolve(img);
      };
      img.onerror = () => {
        this.loadingPromises.delete(url);
        reject(new Error(`Failed to load ${url}`));
      };
      img.src = url;
    });

    this.loadingPromises.set(url, promise);
    return promise;
  }

  // Add progress callback
  onProgress(callback) {
    this.progressCallbacks.push(callback);
  }

  // Update progress
  updateProgress() {
    const total = this.assetCache.size + this.loadingPromises.size;
    const loaded = this.assetCache.size;
    const progress = total > 0 ? (loaded / total) * 100 : 0;

    this.progressCallbacks.forEach(callback => callback(progress));
  }

  // Get loading statistics
  getStats() {
    return {
      cached: this.assetCache.size,
      loading: this.loadingPromises.size,
      total: this.assetCache.size + this.loadingPromises.size
    };
  }

  // Clear cache (for memory management)
  clearCache() {
    this.assetCache.clear();
    this.loadingPromises.clear();
  }
}

// Singleton instance
export const loadingOptimizer = new LoadingOptimizer();

// Utility function for smooth transitions
export function createSmoothTransition(duration = 1000) {
  return new Promise(resolve => {
    const startTime = performance.now();
    
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }
    
    requestAnimationFrame(animate);
  });
}

// Loading message generator
export function getLoadingMessage(progress) {
  const messages = [
    { min: 0, max: 20, message: "Initializing 3D environment... 🚀" },
    { min: 20, max: 40, message: "Loading restaurant assets... 🏪" },
    { min: 40, max: 60, message: "Preparing furniture models... 🪑" },
    { min: 60, max: 80, message: "Setting up lighting... 💡" },
    { min: 80, max: 95, message: "Finalizing your experience... ✨" },
    { min: 95, max: 100, message: "Almost ready... 🎉" }
  ];

  const currentMessage = messages.find(m => progress >= m.min && progress <= m.max);
  return currentMessage ? currentMessage.message : "Loading...";
}

// Performance monitoring for loading
export function monitorLoadingPerformance() {
  const startTime = performance.now();
  
  return {
    end: () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ Loading completed in ${duration.toFixed(2)}ms`);
        
        if (duration > 5000) {
          console.warn(`⚠️ Slow loading detected: ${duration.toFixed(2)}ms. Consider optimizing assets.`);
        }
      }
      
      return duration;
    }
  };
} 