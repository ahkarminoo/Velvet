// Performance monitoring utility for 3D scenes
class PerformanceMonitor {
  constructor() {
    this.fps = 0;
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.isMonitoring = false;
    this.metrics = {
      fps: [],
      memory: [],
      loadTimes: []
    };
    this.maxMetrics = 100; // Keep last 100 measurements
  }

  start() {
    if (process.env.NODE_ENV === 'development') {
      this.isMonitoring = true;
      this.monitor();
      this.startMemoryMonitoring();
    }
  }

  stop() {
    this.isMonitoring = false;
  }

  monitor() {
    if (!this.isMonitoring) return;

    this.frameCount++;
    const currentTime = performance.now();
    
    if (currentTime - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      
      // Store metrics
      this.metrics.fps.push({
        value: this.fps,
        timestamp: currentTime
      });
      
      // Keep only recent metrics
      if (this.metrics.fps.length > this.maxMetrics) {
        this.metrics.fps.shift();
      }
      
      console.log(`🎮 3D Performance: ${this.fps} FPS`);
      
      // Performance warnings with more context
      if (this.fps < 30) {
        console.warn(`⚠️ Low FPS detected: ${this.fps}. Consider reducing scene complexity.`);
        this.suggestOptimizations();
      }
      
      this.frameCount = 0;
      this.lastTime = currentTime;
    }

    requestAnimationFrame(() => this.monitor());
  }

  startMemoryMonitoring() {
    if (process.env.NODE_ENV === 'development' && performance.memory) {
      setInterval(() => {
        this.logMemoryUsage();
      }, 5000); // Check every 5 seconds
    }
  }

  // Memory usage monitoring
  logMemoryUsage() {
    if (process.env.NODE_ENV === 'development' && performance.memory) {
      const memory = performance.memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
      const totalMB = Math.round(memory.totalJSHeapSize / 1048576);
      const limitMB = Math.round(memory.jsHeapSizeLimit / 1048576);
      
      this.metrics.memory.push({
        used: usedMB,
        total: totalMB,
        limit: limitMB,
        timestamp: performance.now()
      });
      
      if (this.metrics.memory.length > this.maxMetrics) {
        this.metrics.memory.shift();
      }
      
      console.log(`💾 Memory Usage:`, {
        used: `${usedMB} MB`,
        total: `${totalMB} MB`,
        limit: `${limitMB} MB`,
        usage: `${Math.round((usedMB / limitMB) * 100)}%`
      });
      
      // Memory warnings
      if (usedMB / limitMB > 0.8) {
        console.warn(`⚠️ High memory usage: ${Math.round((usedMB / limitMB) * 100)}%`);
      }
    }
  }

  // Track loading times
  trackLoadTime(component, duration) {
    this.metrics.loadTimes.push({
      component,
      duration,
      timestamp: performance.now()
    });
    
    if (this.metrics.loadTimes.length > this.maxMetrics) {
      this.metrics.loadTimes.shift();
    }
    
    console.log(`⏱️ ${component} loaded in ${duration.toFixed(2)}ms`);
  }

  // Get performance summary
  getSummary() {
    const avgFps = this.metrics.fps.length > 0 
      ? this.metrics.fps.reduce((sum, m) => sum + m.value, 0) / this.metrics.fps.length 
      : 0;
    
    const avgMemory = this.metrics.memory.length > 0 
      ? this.metrics.memory.reduce((sum, m) => sum + m.used, 0) / this.metrics.memory.length 
      : 0;
    
    return {
      avgFps: Math.round(avgFps),
      avgMemory: Math.round(avgMemory),
      totalMeasurements: this.metrics.fps.length
    };
  }

  // Suggest optimizations based on performance
  suggestOptimizations() {
    const summary = this.getSummary();
    const suggestions = [];
    
    if (summary.avgFps < 30) {
      suggestions.push('Reduce scene complexity');
      suggestions.push('Disable shadows in development');
      suggestions.push('Use lower resolution textures');
    }
    
    if (summary.avgMemory > 500) {
      suggestions.push('Clear unused assets from cache');
      suggestions.push('Reduce texture quality');
      suggestions.push('Implement asset streaming');
    }
    
    if (suggestions.length > 0) {
      console.log('💡 Performance suggestions:', suggestions);
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Utility function to measure function execution time
export function measurePerformance(name, fn) {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`⏱️ ${name} took ${(end - start).toFixed(2)}ms`);
    return result;
  }
  return fn();
} 