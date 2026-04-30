import { SceneManager } from './managers/SceneManager.js';

document.addEventListener('DOMContentLoaded', () => {
    const sceneManager = new SceneManager();
    sceneManager.loadScenes();
});