/**
 * ==============================================================================
 * BLOCK DASH - Input Abstraction & Device Detection Layer
 * ==============================================================================
 * 
 * Provides a clean abstraction between physical input devices (Keyboard, Mouse,
 * Touch, Pointer) and high-level gameplay actions:
 *   - JUMP
 *   - SQUASH (Start / End)
 *   - DASH
 *   - PAUSE
 *   - RETRY
 *
 * Also handles feature-based interface mode detection (Desktop vs Mobile)
 * based on viewport dimensions and pointer precision (pointer: coarse).
 */

export const InputActions = Object.freeze({
  JUMP: 'JUMP',
  SQUASH_START: 'SQUASH_START',
  SQUASH_END: 'SQUASH_END',
  DASH: 'DASH',
  PAUSE: 'PAUSE',
  RETRY: 'RETRY',
  SOUND_TOGGLE: 'SOUND_TOGGLE',
  FULLSCREEN_TOGGLE: 'FULLSCREEN_TOGGLE',
});

export class InputManager {
  constructor(options = {}) {
    this.options = options;
    
    // Action callback registries
    this.listeners = {
      [InputActions.JUMP]: [],
      [InputActions.SQUASH_START]: [],
      [InputActions.SQUASH_END]: [],
      [InputActions.DASH]: [],
      [InputActions.PAUSE]: [],
      [InputActions.RETRY]: [],
      [InputActions.SOUND_TOGGLE]: [],
      [InputActions.FULLSCREEN_TOGGLE]: [],
    };

    // Mode listeners
    this.modeChangeListeners = [];

    // State tracking
    this.isSquashing = false;
    this.activePointers = new Set();
    this.squashPointerId = null;

    // Feature-based detection
    this.mediaQuery = (typeof window !== 'undefined' && window.matchMedia) ? window.matchMedia('(max-width: 768px), (pointer: coarse)') : null;
    this.uiMode = this.detectMode();

    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  /**
   * Detects whether the current device/viewport prefers a Mobile or Desktop UI.
   * Uses viewport width and pointer precision (coarse touch vs fine mouse).
   */
  detectMode() {
    if (typeof window === 'undefined') return 'desktop';
    
    const isCoarse = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false;
    const isSmallScreen = window.innerWidth <= 768 || window.innerHeight <= 500;
    const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);

    return (isCoarse || (isSmallScreen && hasTouch)) ? 'mobile' : 'desktop';
  }

  isMobile() {
    return this.uiMode === 'mobile';
  }

  isDesktop() {
    return this.uiMode === 'desktop';
  }

  /**
   * Subscribes a callback to a specific semantic game action.
   */
  on(action, callback) {
    if (this.listeners[action]) {
      this.listeners[action].push(callback);
    }
  }

  onJump(cb) { this.on(InputActions.JUMP, cb); }
  onSquashStart(cb) { this.on(InputActions.SQUASH_START, cb); }
  onSquashEnd(cb) { this.on(InputActions.SQUASH_END, cb); }
  onDash(cb) { this.on(InputActions.DASH, cb); }
  onPause(cb) { this.on(InputActions.PAUSE, cb); }
  onRetry(cb) { this.on(InputActions.RETRY, cb); }
  onSoundToggle(cb) { this.on(InputActions.SOUND_TOGGLE, cb); }
  onFullscreenToggle(cb) { this.on(InputActions.FULLSCREEN_TOGGLE, cb); }

  onModeChange(cb) {
    this.modeChangeListeners.push(cb);
  }

  /**
   * Emits a semantic action to all registered listeners.
   */
  emit(action, payload = null) {
    if (this.listeners[action]) {
      for (const cb of this.listeners[action]) {
        cb(payload);
      }
    }
  }

  /**
   * Public API methods for direct action requests (used by touch buttons / UI)
   */
  requestJump(e) {
    if (e && e.preventDefault) e.preventDefault();
    this.emit(InputActions.JUMP);
  }

  requestSquashStart(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!this.isSquashing) {
      this.isSquashing = true;
      this.emit(InputActions.SQUASH_START);
    }
  }

  requestSquashEnd(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (this.isSquashing) {
      this.isSquashing = false;
      this.emit(InputActions.SQUASH_END);
    }
  }

  requestDash(e) {
    if (e && e.preventDefault) e.preventDefault();
    this.emit(InputActions.DASH);
  }

  requestPause(e) {
    if (e && e.preventDefault) e.preventDefault();
    this.emit(InputActions.PAUSE);
  }

  requestRetry(e) {
    if (e && e.preventDefault) e.preventDefault();
    this.emit(InputActions.RETRY);
  }

  /**
   * Initializes event listeners for keyboard, mouse, and touch zones.
   */
  init() {
    this.updateBodyClasses();

    // Listen for orientation and viewport changes
    window.addEventListener('resize', () => this.handleResize());
    window.addEventListener('orientationchange', () => this.handleResize());
    if (this.mediaQuery && this.mediaQuery.addEventListener) {
      this.mediaQuery.addEventListener('change', () => this.handleResize());
    }

    // Keyboard bindings (Physical -> Action)
    this.bindKeyboard();

    // Touch & Pointer bindings
    this.bindTouchControls();
  }

  updateBodyClasses() {
    if (typeof document === 'undefined' || !document.body) return;
    const body = document.body;
    if (this.uiMode === 'mobile') {
      body.classList.add('mobile-ui');
      body.classList.remove('desktop-ui');
    } else {
      body.classList.add('desktop-ui');
      body.classList.remove('mobile-ui');
    }
  }

  handleResize() {
    const newMode = this.detectMode();
    const modeChanged = newMode !== this.uiMode;
    this.uiMode = newMode;
    this.updateBodyClasses();

    if (modeChanged) {
      for (const cb of this.modeChangeListeners) {
        cb(this.uiMode);
      }
    }
  }

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Avoid intercepting inputs while typing in text fields (e.g. Callsign)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.code) {
        case 'Space':
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault();
          this.emit(InputActions.JUMP);
          break;

        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          this.requestSquashStart();
          break;

        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyX':
          e.preventDefault();
          this.emit(InputActions.DASH);
          break;

        case 'KeyR':
          e.preventDefault();
          this.emit(InputActions.RETRY);
          break;

        case 'KeyP':
        case 'Escape':
          e.preventDefault();
          this.emit(InputActions.PAUSE);
          break;

        case 'KeyM':
          this.emit(InputActions.SOUND_TOGGLE);
          break;

        case 'KeyF':
          this.emit(InputActions.FULLSCREEN_TOGGLE);
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.requestSquashEnd();
      }
    });
  }

  bindTouchControls() {
    if (typeof document === 'undefined') return;

    const touchJump = document.getElementById('touch-jump-zone');
    const touchSquash = document.getElementById('touch-squash-zone');
    const touchDash = document.getElementById('touch-dash-zone');
    const gameWrapper = document.getElementById('game-wrapper');

    // 1. Large Jump Zone (Primary Play Area)
    if (touchJump) {
      touchJump.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.createTapRipple(e, touchJump);
        this.emit(InputActions.JUMP);
      }, { passive: false });
    }

    // 2. Bottom-Left Squash Zone (Hold to Squash, Release/Leave to Unsquash)
    if (touchSquash) {
      touchSquash.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.squashPointerId = e.pointerId;
        touchSquash.classList.add('active');
        this.requestSquashStart();
      }, { passive: false });

      const clearSquash = (e) => {
        if (this.squashPointerId === null || e.pointerId === this.squashPointerId) {
          this.squashPointerId = null;
          touchSquash.classList.remove('active');
          this.requestSquashEnd();
        }
      };

      touchSquash.addEventListener('pointerup', clearSquash, { passive: false });
      touchSquash.addEventListener('pointercancel', clearSquash, { passive: false });
      touchSquash.addEventListener('pointerleave', clearSquash, { passive: false });
    }

    // 3. Bottom-Right Dash Zone (Tap to Dash)
    if (touchDash) {
      touchDash.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        touchDash.classList.add('active');
        this.emit(InputActions.DASH);
      }, { passive: false });

      const clearDashActive = () => {
        touchDash.classList.remove('active');
      };
      touchDash.addEventListener('pointerup', clearDashActive);
      touchDash.addEventListener('pointercancel', clearDashActive);
      touchDash.addEventListener('pointerleave', clearDashActive);
    }

    // 4. Global Game Wrapper Fallback Jump Tap (for desktop click or wide touch)
    if (gameWrapper) {
      gameWrapper.addEventListener('pointerdown', (e) => {
        // Ignore if clicking on UI overlays or buttons
        if (e.target.closest('.ui-overlay') && !e.target.closest('#intro-overlay')) {
          return;
        }
        if (e.target.closest('#mobile-touch-container') || e.target.closest('#top-controls')) {
          return;
        }
        if (e.button !== undefined && e.button !== 0) return; // Left-click only on desktop

        this.emit(InputActions.JUMP);
      });
    }

    // Global safety: if window loses focus or pointer is cancelled, end squash
    window.addEventListener('blur', () => {
      this.requestSquashEnd();
      if (touchSquash) touchSquash.classList.remove('active');
    });
  }

  /**
   * Creates a tactile neon tap ripple on mobile tap zones.
   */
  createTapRipple(e, container) {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const ripple = document.createElement('div');
    ripple.className = 'touch-ripple';

    const clientX = e.clientX || (rect.left + rect.width / 2);
    const clientY = e.clientY || (rect.top + rect.height / 2);
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    container.appendChild(ripple);
    setTimeout(() => {
      if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
    }, 450);
  }
}
