// Global type definitions for third-party libraries
declare namespace bootstrap {
  class Tooltip {
    constructor(element: Element, options?: any);
    show(): void;
    hide(): void;
    dispose(): void;
  }

  class Dropdown {
    constructor(element: Element, options?: any);
    show(): void;
    hide(): void;
    dispose(): void;
  }

  class Offcanvas {
    constructor(element: Element, options?: any);
    show(): void;
    hide(): void;
    dispose(): void;
  }

  class Collapse {
    constructor(element: Element, options?: any);
    show(): void;
    hide(): void;
    dispose(): void;
  }
}

declare interface Window {
  bootstrap: typeof bootstrap;
  Swiper: any;
}

// Extend EventTarget for our patch
declare interface EventTarget {
  nodeType?: number;
}