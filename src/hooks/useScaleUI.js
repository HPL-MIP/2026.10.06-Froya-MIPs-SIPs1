import { useRef, useEffect, useState, useCallback } from 'react';

const useScaleUI = (
  baseWidth = 420,
  baseHeight = 820,
  isShowEndScene = false
) => {
  const appRef = useRef(null);
  const wrapperRef = useRef(null);
  const [isLandscape, setIsLandscape] = useState(false);

  const updateScale = useCallback(() => {
    if (!appRef.current || !wrapperRef.current) return;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const landscape = windowWidth > windowHeight;

    setIsLandscape(landscape);

    const targetWidth = baseWidth;
    const targetHeight = baseHeight;

    const scaleX = windowWidth / targetWidth;
    const scaleY = windowHeight / targetHeight;
    const scale = Math.min(scaleX, scaleY);

    const scaledWidth = targetWidth * scale;
    const scaledHeight = targetHeight * scale;

    const offsetX = (windowWidth - scaledWidth) / 2;
    const offsetY = (windowHeight - scaledHeight) / 2;

    appRef.current.style.width = `${targetWidth}px`;
    appRef.current.style.height = `${targetHeight}px`;
    appRef.current.style.transformOrigin = 'top left';
    appRef.current.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    appRef.current.style.zoom = '';
    appRef.current.style.left = '';
    appRef.current.style.top = '';
  }, [baseWidth, baseHeight, isShowEndScene]);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  return { appRef, wrapperRef, isLandscape };
};

export default useScaleUI;
