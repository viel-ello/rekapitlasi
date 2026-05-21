function getScrollableAncestors(element) {
  if (!element || typeof window === 'undefined') return [];

  const ancestors = [];
  let node = element.parentElement;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const overflow = `${style.overflow} ${style.overflowY} ${style.overflowX}`;
    const canScroll =
      /(auto|scroll)/.test(overflow) &&
      (node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth);

    if (canScroll) ancestors.push(node);
    node = node.parentElement;
  }
  return ancestors;
}

function getPreservedContainers(anchor) {
  if (typeof document === 'undefined') return [];

  const containers = new Set([
    ...document.querySelectorAll('[data-preserve-scroll], .data-table-wrapper'),
    ...getScrollableAncestors(anchor),
  ]);

  return [...containers];
}

export function captureScrollState(anchor = null) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  const activeElement = anchor || document.activeElement;
  const hasAnchor = activeElement instanceof HTMLElement && activeElement !== document.body;
  const anchorRect = hasAnchor ? activeElement.getBoundingClientRect() : null;

  return {
    windowX: window.scrollX,
    windowY: window.scrollY,
    anchor: hasAnchor ? activeElement : null,
    anchorTop: anchorRect?.top ?? null,
    containers: getPreservedContainers(hasAnchor ? activeElement : null).map((element) => ({
      element,
      scrollTop: element.scrollTop,
      scrollLeft: element.scrollLeft,
    })),
  };
}

export function restoreScrollState(snapshot) {
  if (!snapshot || typeof window === 'undefined') return;

  requestAnimationFrame(() => requestAnimationFrame(() => {
    snapshot.containers.forEach(({ element, scrollTop, scrollLeft }) => {
      if (!element.isConnected) return;
      element.scrollTop = scrollTop;
      element.scrollLeft = scrollLeft;
    });

    if (snapshot.anchor?.isConnected && snapshot.anchorTop != null) {
      const currentTop = snapshot.anchor.getBoundingClientRect().top;
      const delta = currentTop - snapshot.anchorTop;
      window.scrollTo({
        top: window.scrollY + delta,
        left: snapshot.windowX,
        behavior: 'instant',
      });
      return;
    }

    window.scrollTo({
      top: snapshot.windowY,
      left: snapshot.windowX,
      behavior: 'instant',
    });
  }));
}
