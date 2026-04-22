import React from 'react';

declare module 'react' {
  interface ReactPortal extends React.ReactElement {
    key: React.Key | null;
  }
}

// Ensure bigint is treated as a valid React node if passed as a child
declare global {
  namespace React {
    interface ReactNodeArray extends Array<ReactNode> {}
  }
}
