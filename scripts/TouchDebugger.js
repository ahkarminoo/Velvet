/**
 * TouchDebugger - Utility for debugging touch interactions in the floorplan editor
 * Add ?debug=touch to the URL to enable debug mode
 */

export class TouchDebugger {
    constructor() {
        this.isEnabled = this.checkDebugMode();
        this.touchPoints = new Map();
        this.debugOverlay = null;
        this.eventLog = [];
        this.maxLogEntries = 100;

        if (this.isEnabled) {
            this.init();
        }
    }

    checkDebugMode() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('debug') === 'touch';
    }

    init() {
        this.createDebugOverlay();
        this.attachGlobalTouchListeners();
        console.log('🔧 Touch Debugger Enabled');
    }

    createDebugOverlay() {
        this.debugOverlay = document.createElement('div');
        this.debugOverlay.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            max-width: 300px;
            max-height: 400px;
            overflow-y: auto;
            pointer-events: none;
            border: 1px solid #333;
        `;

        this.debugOverlay.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px; color: #00ff00;">
                🔧 Touch Debug Mode
            </div>
            <div id="touch-stats">
                <div>Active Touches: <span id="active-touches">0</span></div>
                <div>Device: <span id="device-info">${this.getDeviceInfo()}</span></div>
                <div>Touch Support: <span id="touch-support">${this.getTouchSupport()}</span></div>
            </div>
            <div style="margin: 10px 0; border-top: 1px solid #333; padding-top: 10px;">
                <div style="font-weight: bold; margin-bottom: 5px;">Event Log:</div>
                <div id="event-log" style="max-height: 200px; overflow-y: auto;"></div>
            </div>
        `;

        document.body.appendChild(this.debugOverlay);
    }

    attachGlobalTouchListeners() {
        // Listen to all touch events on the document
        document.addEventListener('touchstart', (e) => this.logTouchEvent('touchstart', e), true);
        document.addEventListener('touchmove', (e) => this.logTouchEvent('touchmove', e), true);
        document.addEventListener('touchend', (e) => this.logTouchEvent('touchend', e), true);
        document.addEventListener('touchcancel', (e) => this.logTouchEvent('touchcancel', e), true);

        // Also listen to gesture events
        document.addEventListener('gesturestart', (e) => this.logGestureEvent('gesturestart', e), true);
        document.addEventListener('gesturechange', (e) => this.logGestureEvent('gesturechange', e), true);
        document.addEventListener('gestureend', (e) => this.logGestureEvent('gestureend', e), true);
    }

    logTouchEvent(type, event) {
        const timestamp = new Date().toLocaleTimeString();
        const touchCount = event.touches.length;
        const changedTouchCount = event.changedTouches.length;

        // Update active touch count
        document.getElementById('active-touches').textContent = touchCount;

        // Log touch coordinates for visual debugging
        this.visualizeTouches(event.touches);

        // Add to event log
        const logEntry = {
            time: timestamp,
            type: type,
            touches: touchCount,
            changed: changedTouchCount,
            target: event.target.tagName || 'Unknown'
        };

        this.addLogEntry(`${timestamp} - ${type}: ${touchCount} touches, target: ${logEntry.target}`);

        // Detailed touch point information
        if (event.touches.length > 0) {
            Array.from(event.touches).forEach((touch, index) => {
                const coords = `Touch ${index}: (${Math.round(touch.clientX)}, ${Math.round(touch.clientY)})`;
                this.addLogEntry(`  ${coords}`, true);
            });
        }
    }

    logGestureEvent(type, event) {
        const timestamp = new Date().toLocaleTimeString();
        const scale = event.scale ? event.scale.toFixed(2) : 'N/A';
        const rotation = event.rotation ? event.rotation.toFixed(2) : 'N/A';

        this.addLogEntry(`${timestamp} - ${type}: scale=${scale}, rotation=${rotation}`);
    }

    visualizeTouches(touches) {
        // Remove existing touch indicators
        document.querySelectorAll('.debug-touch-indicator').forEach(el => el.remove());

        // Add new touch indicators
        Array.from(touches).forEach((touch, index) => {
            const indicator = document.createElement('div');
            indicator.className = 'debug-touch-indicator';
            indicator.style.cssText = `
                position: fixed;
                left: ${touch.clientX - 15}px;
                top: ${touch.clientY - 15}px;
                width: 30px;
                height: 30px;
                border: 3px solid #ff0000;
                border-radius: 50%;
                background: rgba(255, 0, 0, 0.3);
                z-index: 9999;
                pointer-events: none;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 12px;
            `;
            indicator.textContent = index + 1;
            document.body.appendChild(indicator);

            // Remove after 1 second
            setTimeout(() => indicator.remove(), 1000);
        });
    }

    addLogEntry(message, isSubItem = false) {
        const logDiv = document.getElementById('event-log');
        if (!logDiv) return;

        const entry = document.createElement('div');
        entry.style.cssText = `
            margin: 2px 0;
            color: ${isSubItem ? '#ccc' : '#fff'};
            padding-left: ${isSubItem ? '20px' : '0px'};
            font-size: ${isSubItem ? '11px' : '12px'};
        `;
        entry.textContent = message;

        logDiv.appendChild(entry);

        // Limit log entries
        this.eventLog.push(message);
        if (this.eventLog.length > this.maxLogEntries) {
            this.eventLog.shift();
            if (logDiv.firstChild) {
                logDiv.removeChild(logDiv.firstChild);
            }
        }

        // Auto-scroll to bottom
        logDiv.scrollTop = logDiv.scrollHeight;
    }

    getDeviceInfo() {
        const platform = navigator.platform || 'Unknown';
        const userAgent = navigator.userAgent;
        
        if (/iPad|iPhone|iPod/.test(userAgent)) {
            return 'iOS Device';
        } else if (/Android/.test(userAgent)) {
            return 'Android Device';
        } else if (/Windows/.test(platform)) {
            return 'Windows Device';
        } else if (/Mac/.test(platform)) {
            return 'Mac Device';
        } else {
            return platform;
        }
    }

    getTouchSupport() {
        const touchSupport = [];
        
        if ('ontouchstart' in window) {
            touchSupport.push('Touch Events');
        }
        
        if (navigator.maxTouchPoints > 0) {
            touchSupport.push(`${navigator.maxTouchPoints} Touch Points`);
        }
        
        if ('onpointerdown' in window) {
            touchSupport.push('Pointer Events');
        }

        return touchSupport.length > 0 ? touchSupport.join(', ') : 'Not Detected';
    }

    // Method to test specific touch manager functionality
    testTouchManager(touchManager) {
        if (!this.isEnabled || !touchManager) return;

        console.log('🧪 Testing TouchManager functionality...');

        // Test method availability
        const methods = [
            'handleTouchStart',
            'handleTouchMove', 
            'handleTouchEnd',
            'createTouchRaycaster',
            'showTouchFeedback'
        ];

        methods.forEach(method => {
            if (typeof touchManager[method] === 'function') {
                console.log(`✅ ${method} is available`);
            } else {
                console.log(`❌ ${method} is missing`);
            }
        });

        // Test touch detection
        this.addLogEntry('TouchManager initialized and tested');
    }

    // Generate touch test report
    generateReport() {
        if (!this.isEnabled) return null;

        return {
            deviceInfo: this.getDeviceInfo(),
            touchSupport: this.getTouchSupport(),
            eventLog: [...this.eventLog],
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            screenSize: `${screen.width}x${screen.height}`,
            viewportSize: `${window.innerWidth}x${window.innerHeight}`
        };
    }

    // Download debug report
    downloadReport() {
        if (!this.isEnabled) return;

        const report = this.generateReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `touch-debug-report-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.addLogEntry('Debug report downloaded');
    }

    // Clean up
    destroy() {
        if (this.debugOverlay && document.body.contains(this.debugOverlay)) {
            document.body.removeChild(this.debugOverlay);
        }
        
        // Remove touch indicators
        document.querySelectorAll('.debug-touch-indicator').forEach(el => el.remove());
        
        console.log('🔧 Touch Debugger Disabled');
    }
}

// Auto-initialize if debug mode is enabled
const touchDebugger = new TouchDebugger();

// Expose globally for manual testing
window.TouchDebugger = touchDebugger;
