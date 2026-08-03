// a bare namespace value that is never destructured, so it may escape and needs
// a decoupled namespace object keyed by the original export names
import * as ns from "./mangled.js";

export const escaped = ns;
