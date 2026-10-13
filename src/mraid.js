let isReadyFired = false;
let isReadyTracked = false;

export function trackMraidReadiness(mraid = typeof window !== 'undefined' ? window.mraid : undefined) {
  if (isReadyTracked || !mraid || typeof mraid.addEventListener !== 'function') return;
  try {
    mraid.addEventListener('ready', () => { isReadyFired = true; });
    isReadyTracked = true;
  } catch {}
}

export function isMraidUsable(mraid = typeof window !== 'undefined' ? window.mraid : undefined) {
  if (!mraid) return false;
  trackMraidReadiness(mraid);
  if (typeof mraid.getState !== 'function') return true;
  try {
    const state = mraid.getState();
    return state === 'default' || state === 'expanded';
  } catch {
    return isReadyFired;
  }
}

export function initializeWhenMraidReady(init) {
  const mraid = typeof window !== 'undefined' ? window.mraid : undefined;
  if (!mraid || typeof mraid.getState !== 'function') {
    init();
    return () => {};
  }
  trackMraidReadiness(mraid);
  let initialized = false;
  const cleanup = () => {
    mraid.removeEventListener?.('ready', ready);
    mraid.removeEventListener?.('stateChange', ready);
  };
  const ready = () => {
    if (initialized || !isMraidUsable(mraid)) return;
    initialized = true;
    cleanup();
    init();
  };

  try {
    // Keep this exact positive check for static validator compliance
    if (mraid.getState() === "loading") {
      mraid.addEventListener?.('ready', ready);
      mraid.addEventListener?.('stateChange', ready);
    } else if (isMraidUsable(mraid)) {
      ready();
    } else {
      mraid.addEventListener?.('stateChange', ready);
    }
  } catch {
    cleanup();
  }
  return cleanup;
}

export function observeViewability(onChange) {
  const mraid = typeof window !== 'undefined' ? window.mraid : undefined;
  let pageActive = true;
  const sync = () => {
    let visible = pageActive && (typeof document !== 'undefined' ? document.visibilityState === 'visible' : true);
    if (mraid) {
      visible = visible && isMraidUsable(mraid);
      try {
        visible = visible && typeof mraid.isViewable === 'function' && mraid.isViewable();
      } catch {
        visible = false;
      }
    }
    onChange(Boolean(visible));
  };
  const hide = () => { pageActive = false; sync(); };
  const show = () => { pageActive = true; sync(); };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', sync);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', show);
    window.addEventListener('blur', hide);
    window.addEventListener('focus', show);
  }
  mraid?.addEventListener?.('viewableChange', sync);
  mraid?.addEventListener?.('stateChange', sync);
  mraid?.addEventListener?.('ready', sync);
  sync();
  return () => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', sync);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', show);
      window.removeEventListener('blur', hide);
      window.removeEventListener('focus', show);
    }
    mraid?.removeEventListener?.('viewableChange', sync);
    mraid?.removeEventListener?.('stateChange', sync);
    mraid?.removeEventListener?.('ready', sync);
  };
}

if (typeof window !== 'undefined') {
  window.isMraidUsable = isMraidUsable;
  window.trackMraidReadiness = trackMraidReadiness;
  window.initializeWhenMraidReady = initializeWhenMraidReady;
}
