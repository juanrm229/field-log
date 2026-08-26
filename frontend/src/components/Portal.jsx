import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/*
  Renders children into document.body.

  A fullscreen overlay must not depend on where it happens to sit in the tree.
  z-index only competes within the nearest stacking context, and any ancestor
  with a transform, a filter, or a running animation silently creates one — the
  route-transition wrapper did exactly that and pushed the reader underneath the
  site header despite z-100 against z-50. Portalling puts the overlay at the top
  level where its z-index means what it says.
*/
const Portal = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  return mounted ? createPortal(children, document.body) : null;
};

export default Portal;
