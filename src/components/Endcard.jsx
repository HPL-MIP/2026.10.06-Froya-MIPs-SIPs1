import { useEffect, useRef, useState } from 'react';
import sipHtml from '../assets/end/sip-date-20261007-0931.html?raw';
import transitionAudio from '../assets/end/endscene.mp3';
import { openClickthrough } from '../clickthrough';
import { observeViewability } from '../mraid';

const bridgeScript = `<script src="mraid.js"></script>
<script>
  try {
    window.mraid = parent.mraid || window.mraid;
    window.clickTag = parent.clickTag || window.clickTag;
    window.clickTag1 = parent.clickTag1 || window.clickTag1;
    window.clickthrough = parent.clickthrough || window.clickthrough;
    window.clickThrough = parent.clickThrough || window.clickThrough;
  } catch (error) {}
</script>`;
const endCardHtml = sipHtml.replace('<script src="mraid.js"></script>', bridgeScript);

export const Endcard = ({ clickUrl = '', onReady, onRevealComplete }) => {
  const [visible, setVisible] = useState(false);
  const iframeRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    let cancelled = false;
    let started = false;
    let firstFrame;
    let secondFrame;
    let revealTimer;
    const reveal = () => {
      if (cancelled || started) return;
      started = true;
      clearTimeout(fallback);
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          if (cancelled) return;
          setVisible(true);
          onReady?.();
          const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 180 : 500;
          revealTimer = setTimeout(() => onRevealComplete?.(), duration);
        });
      });
    };
    const fallback = setTimeout(reveal, 1200);
    iframe.addEventListener('load', reveal);
    if (iframe.contentDocument?.readyState === 'complete' &&
        iframe.contentDocument.querySelector('#video-container')) reveal();
    return () => {
      cancelled = true;
      clearTimeout(fallback);
      clearTimeout(revealTimer);
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      iframe.removeEventListener('load', reveal);
    };
  }, [onReady, onRevealComplete]);

  useEffect(() => {
    if (!visible) return;
    const audio = audioRef.current;
    let viewable = false;
    const syncPlayback = () => {
      if (!viewable) audio.pause();
      else if (audio.paused && !audio.ended) audio.play().catch(() => {});
    };
    const stopObserving = observeViewability((isViewable) => {
      viewable = isViewable;
      syncPlayback();
    });
    audio.addEventListener('loadeddata', syncPlayback);
    audio.addEventListener('play', syncPlayback);
    window.addEventListener('pointerup', syncPlayback);
    return () => {
      stopObserving();
      audio.removeEventListener('loadeddata', syncPlayback);
      audio.removeEventListener('play', syncPlayback);
      window.removeEventListener('pointerup', syncPlayback);
      audio.pause();
    };
  }, [visible]);

  return (
    <div
      className="end-scene-fade"
      data-visible={visible}
      data-end-scene=""
      onPointerDown={(event) => event.stopPropagation()}
    >
      <audio ref={audioRef} src={transitionAudio} preload="auto" />
      <iframe
        ref={iframeRef}
        title="Froya end scene"
        srcDoc={endCardHtml}
        sandbox="allow-scripts allow-same-origin"
        className="end-scene-frame"
        tabIndex={-1}
      />
      <button
        type="button"
        aria-label="Open offer"
        tabIndex={-1}
        className="end-scene-clickthrough"
        onClick={(event) => {
          event.stopPropagation();
          if (event.detail === 0) return;
          console.log('CTA_CLICKED');
          openClickthrough(clickUrl);
        }}
      />
    </div>
  );
};

export default Endcard;
