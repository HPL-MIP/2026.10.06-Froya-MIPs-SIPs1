import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Cta } from "./components/Cta";
import { openClickthrough } from "./clickthrough";
import logo from "./assets/Logo.webp";
import scrollImageTop from "./assets/SCROLL ASSET (1)-1.webp";
import scrollImageBottom from "./assets/SCROLL ASSET (1)-2.webp";
import scrollUpImage from "./assets/Scroll Up Button.webp";
import Endcard from "./components/Endcard";

const CREATIVE_WIDTH = 390;
const STICKY_CTA_BOTTOM = 0;
const STICKY_CTA_HEIGHT = 86;
const SCROLL_GUIDE_GAP = 8;
const MOMENTUM_FRICTION = 0.92;
const MOMENTUM_FRAME_MS = 16.67;
const MOMENTUM_MIN_VELOCITY = 0.04;

const interactiveSelector =
  "a, button, input, textarea, select, summary, [role='button']";



function ScrollGuide({ scrollContainerRef }) {
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);

  useEffect(() => {
    const hideAfterFirstInteraction = () => setHasInteracted(true);
    const interactionEvents = ["wheel", "touchmove", "keydown"];
    const scrollNode = scrollContainerRef.current;

    const updateScrollGuideState = () => {
      const nextIsAtTop = !scrollNode || scrollNode.scrollTop <= 2;

      setIsAtTop(nextIsAtTop);

      if (!nextIsAtTop) {
        setHasInteracted(true);
      }
    };

    updateScrollGuideState();

    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, hideAfterFirstInteraction, {
        passive: true,
        once: true,
      });
    });

    scrollNode?.addEventListener("scroll", updateScrollGuideState, {
      passive: true,
    });

    return () => {
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, hideAfterFirstInteraction);
      });
      scrollNode?.removeEventListener("scroll", updateScrollGuideState);
    };
  }, [scrollContainerRef]);

  return (
    <div
      className={`scroll-guide${isAtTop || !hasInteracted ? " is-visible" : ""}`}
      aria-hidden="true"
    />
  );
}



export default function App() {
  const pageShellRef = useRef(null);
  const landingPageRef = useRef(null);
  const headerRef = useRef(null);
  const endSceneTimeoutRef = useRef(null);

  const [isBottomClickActive, setIsBottomClickActive] = useState(false);
  const [showEndScene, setShowEndScene] = useState(false);
  const [showScrollUp, setShowScrollUp] = useState(false);
  const [isDragScrolling, setIsDragScrolling] = useState(false);
  const [layoutScale, setLayoutScale] = useState(1);
  const [scaledContentHeight, setScaledContentHeight] = useState(0);
  const [isContentFitted, setIsContentFitted] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);

  const dragScrollRef = useRef({
    isDragging: false,
    hasDragged: false,
    pointerId: null,
    dragDistance: 0,
    lastY: 0,
    lastMoveTime: 0,
    velocity: 0,
    momentumAnimationId: null,
    suppressNextClick: false,
  });

  useLayoutEffect(() => {
    const scrollNode = pageShellRef.current;
    const contentNode = landingPageRef.current;
    const headerNode = headerRef.current;

    if (!scrollNode || !contentNode || !headerNode) {
      return undefined;
    }

    const updateScaledLayout = () => {
      const viewportWidth =
        scrollNode.clientWidth || window.innerWidth || CREATIVE_WIDTH;
      const nextViewportHeight =
        scrollNode.clientHeight || window.innerHeight || 0;
      const nextScale = Math.min(viewportWidth / CREATIVE_WIDTH, 1);
      const nextContentHeight = Math.ceil(contentNode.scrollHeight * nextScale);
      const nextIsContentFitted = nextContentHeight <= nextViewportHeight;

      setLayoutScale((current) =>
        Math.abs(current - nextScale) < 0.001 ? current : nextScale,
      );
      setScaledContentHeight((current) =>
        current === nextContentHeight ? current : nextContentHeight,
      );
      setIsContentFitted((current) =>
        current === nextIsContentFitted ? current : nextIsContentFitted,
      );
      setViewportHeight((current) =>
        current === nextViewportHeight ? current : nextViewportHeight,
      );
    };

    updateScaledLayout();

    const resizeObserver =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(updateScaledLayout)
        : null;

    resizeObserver?.observe(scrollNode);
    resizeObserver?.observe(contentNode);
    resizeObserver?.observe(headerNode);

    window.addEventListener("resize", updateScaledLayout);
    window.addEventListener("orientationchange", updateScaledLayout);
    window.addEventListener("load", updateScaledLayout);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateScaledLayout);
      window.removeEventListener("orientationchange", updateScaledLayout);
      window.removeEventListener("load", updateScaledLayout);
    };
  }, []);

  useEffect(() => {
    const scrollNode = pageShellRef.current;

    if (!scrollNode) {
      return undefined;
    }

    const updateBottomClickState = () => {
      setShowScrollUp(scrollNode.scrollTop > 2);
      const scrollBottom = scrollNode.scrollTop + scrollNode.clientHeight;
      const isAtBottom = scrollBottom >= scrollNode.scrollHeight - 4;

      setIsBottomClickActive((current) =>
        current === isAtBottom ? current : isAtBottom,
      );

      if (isAtBottom) {
        if (!endSceneTimeoutRef.current) {
          endSceneTimeoutRef.current = setTimeout(() => {
            setShowEndScene(true);
          }, 3000);
        }
      } else {
        if (endSceneTimeoutRef.current) {
          clearTimeout(endSceneTimeoutRef.current);
          endSceneTimeoutRef.current = null;
        }
      }
    };

    updateBottomClickState();

    scrollNode.addEventListener("scroll", updateBottomClickState, {
      passive: true,
    });
    window.addEventListener("resize", updateBottomClickState);
    window.addEventListener("load", updateBottomClickState);

    const resizeObserver =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(updateBottomClickState)
        : null;

    resizeObserver?.observe(scrollNode);

    return () => {
      scrollNode.removeEventListener("scroll", updateBottomClickState);
      window.removeEventListener("resize", updateBottomClickState);
      window.removeEventListener("load", updateBottomClickState);
      resizeObserver?.disconnect();
    };
  }, []);

  const endDragScroll = useCallback((pointerId = dragScrollRef.current.pointerId) => {
    const dragState = dragScrollRef.current;

    if (!dragState.isDragging) {
      return;
    }

    const scrollNode = pageShellRef.current;

    if (
      pointerId !== null &&
      scrollNode?.hasPointerCapture?.(pointerId)
    ) {
      scrollNode.releasePointerCapture(pointerId);
    }

    const releaseVelocity = dragState.hasDragged ? dragState.velocity : 0;

    dragScrollRef.current = {
      ...dragState,
      isDragging: false,
      pointerId: null,
      velocity: releaseVelocity,
      suppressNextClick: dragState.hasDragged,
    };

    setIsDragScrolling(false);

    if (!scrollNode || Math.abs(releaseVelocity) < MOMENTUM_MIN_VELOCITY) {
      return;
    }

    let velocity = releaseVelocity;
    let lastFrameTime = performance.now();

    const runMomentum = (frameTime) => {
      const elapsed = Math.min(frameTime - lastFrameTime, 34);
      lastFrameTime = frameTime;

      const previousScrollTop = scrollNode.scrollTop;
      scrollNode.scrollTop += velocity * elapsed;
      velocity *= Math.pow(MOMENTUM_FRICTION, elapsed / MOMENTUM_FRAME_MS);

      if (
        Math.abs(velocity) < MOMENTUM_MIN_VELOCITY ||
        scrollNode.scrollTop === previousScrollTop
      ) {
        dragScrollRef.current.momentumAnimationId = null;
        return;
      }

      dragScrollRef.current.velocity = velocity;
      dragScrollRef.current.momentumAnimationId =
        window.requestAnimationFrame(runMomentum);
    };

    dragScrollRef.current.momentumAnimationId =
      window.requestAnimationFrame(runMomentum);
  }, []);

  useEffect(() => {
    const handleGlobalPointerEnd = (event) => {
      endDragScroll(event.pointerId);
    };

    const handleGlobalMouseEnd = () => {
      endDragScroll();
    };

    window.addEventListener("pointerup", handleGlobalPointerEnd);
    window.addEventListener("pointercancel", handleGlobalPointerEnd);
    window.addEventListener("mouseup", handleGlobalMouseEnd);
    window.addEventListener("blur", handleGlobalMouseEnd);

    return () => {
      const { momentumAnimationId } = dragScrollRef.current;

      if (momentumAnimationId !== null) {
        window.cancelAnimationFrame(momentumAnimationId);
      }

      window.removeEventListener("pointerup", handleGlobalPointerEnd);
      window.removeEventListener("pointercancel", handleGlobalPointerEnd);
      window.removeEventListener("mouseup", handleGlobalMouseEnd);
      window.removeEventListener("blur", handleGlobalMouseEnd);
    };
  }, [endDragScroll]);

  const handleDragScrollStart = (event) => {
    if (
      event.pointerType !== "mouse" ||
      event.button !== 0 ||
      !(event.target instanceof Element) ||
      event.target.closest(interactiveSelector)
    ) {
      return;
    }

    event.preventDefault();

    const { momentumAnimationId } = dragScrollRef.current;

    if (momentumAnimationId !== null) {
      window.cancelAnimationFrame(momentumAnimationId);
    }

    dragScrollRef.current = {
      isDragging: true,
      hasDragged: false,
      pointerId: event.pointerId,
      dragDistance: 0,
      lastY: event.clientY,
      lastMoveTime: performance.now(),
      velocity: 0,
      momentumAnimationId: null,
      suppressNextClick: false,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleDragScrollMove = (event) => {
    if (event.pointerType !== "mouse") {
      return;
    }

    const dragState = dragScrollRef.current;

    if (!dragState.isDragging || dragState.pointerId !== event.pointerId) {
      return;
    }

    const scrollDelta = dragState.lastY - event.clientY;
    const now = performance.now();
    const elapsed = Math.max(now - dragState.lastMoveTime, 8);

    dragState.dragDistance += Math.abs(scrollDelta);
    dragState.lastY = event.clientY;
    dragState.lastMoveTime = now;
    dragState.velocity = scrollDelta / elapsed;

    if (dragState.dragDistance > 3) {
      dragState.hasDragged = true;
      setIsDragScrolling(true);
    }

    if (dragState.hasDragged) {
      event.preventDefault();
      event.currentTarget.scrollTop += scrollDelta;
    }
  };

  const handleDragScrollEnd = (event) => {
    const dragState = dragScrollRef.current;

    if (!dragState.isDragging || dragState.pointerId !== event.pointerId) {
      return;
    }

    endDragScroll(event.pointerId);
  };

  const handlePageClick = (event) => {
    if (dragScrollRef.current.suppressNextClick) {
      dragScrollRef.current.suppressNextClick = false;
      return;
    }

    if (!isBottomClickActive || !(event.target instanceof Element)) {
      return;
    }

    if (event.target.closest(interactiveSelector)) {
      return;
    }

    console.log('CTA_CLICKED');
    openClickthrough();
  };

  const fittedBottomOffset = isContentFitted
    ? Math.max(0, viewportHeight - scaledContentHeight)
    : 0;

  const scrollToTop = (e) => {
    e.stopPropagation();
    const scrollNode = pageShellRef.current;
    if (scrollNode) {
      scrollNode.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const pageShellStyle = {
    "--creative-scale": layoutScale,
    "--scaled-content-height": `${scaledContentHeight}px`,
    "--scaled-sticky-cta-bottom": `${fittedBottomOffset + STICKY_CTA_BOTTOM * layoutScale
      }px`,
    "--scaled-scroll-guide-bottom": `${fittedBottomOffset +
      (STICKY_CTA_BOTTOM + STICKY_CTA_HEIGHT + SCROLL_GUIDE_GAP) * layoutScale + 10
      }px`,
  };

  return (
    <div
      ref={pageShellRef}
      style={pageShellStyle}
      className={`page-shell${isContentFitted ? " page-shell--content-fits" : ""}${isBottomClickActive ? " page-shell--bottom-clickable" : ""
        }${isDragScrolling ? " page-shell--dragging" : ""}`}
      onClick={handlePageClick}
      onPointerDown={handleDragScrollStart}
      onPointerMove={handleDragScrollMove}
      onPointerUp={handleDragScrollEnd}
      onPointerCancel={handleDragScrollEnd}
      onLostPointerCapture={handleDragScrollEnd}
    >
      <div className="sticky-header-container">
        <header ref={headerRef} className="site-header">
          <img src={logo} alt="Frøya Organics" className="logo" />
        </header>
      </div>
      <div className="landing-page-frame">
        <main ref={landingPageRef} className="landing-page">
          <article className="article">
            <div className="article-image">
              <img src={scrollImageTop} width={1084} height={13325} alt="Ian Somerhalder shares his Frøya Organics skincare routine" />
              <img src={scrollImageBottom} width={1084} height={13325} alt="Frøya Organics ingredients, skincare results, and Ian’s recommendation" />
            </div>
          </article>
        </main>
      </div>

      <ScrollGuide scrollContainerRef={pageShellRef} />
      {showScrollUp && (
        <button
          type="button"
          onClick={scrollToTop}
          className="scroll-up-button"
          aria-label="Scroll to top"
        >
          <img src={scrollUpImage} alt="" draggable="false" />
        </button>
      )}
      <Cta className="sticky-cta" sticky atBottom={isBottomClickActive} />
      {showEndScene && <Endcard />}
    </div>
  );
}
