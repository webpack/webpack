import { value } from "./other";

// An identifier spelled like a module reference but not followed by the "._"
// webpack appends: resolving it must keep the comment that follows it.
export const kind = typeof __WEBPACK_MODULE_REFERENCE__0_ns__/* kept */;
export const sum = value + 1;
