export function isMraidUsable(mraid = window.mraid) {
  if (!mraid || typeof mraid.getState !== 'function') return false;
  try {
    const state = mraid.getState();
    return state === 'default' || state === 'expanded';
  } catch {
    return false;
  }
}

export function initializeWhenMraidReady(init) {
  const mraid = window.mraid;
  if (!mraid) {
    init();
    return () => {};
  }
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
  if (typeof mraid.getState !== 'function') return () => {};
  try {
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
  const mraid = window.mraid;
  let pageActive = true;
  const sync = () => {
    let visible = pageActive && document.visibilityState === 'visible';
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
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', hide);
  window.addEventListener('pageshow', show);
  window.addEventListener('blur', hide);
  window.addEventListener('focus', show);
  mraid?.addEventListener?.('viewableChange', sync);
  mraid?.addEventListener?.('stateChange', sync);
  mraid?.addEventListener?.('ready', sync);
  sync();
  return () => {
    document.removeEventListener('visibilitychange', sync);
    window.removeEventListener('pagehide', hide);
    window.removeEventListener('pageshow', show);
    window.removeEventListener('blur', hide);
    window.removeEventListener('focus', show);
    mraid?.removeEventListener?.('viewableChange', sync);
    mraid?.removeEventListener?.('stateChange', sync);
    mraid?.removeEventListener?.('ready', sync);
  };
}
