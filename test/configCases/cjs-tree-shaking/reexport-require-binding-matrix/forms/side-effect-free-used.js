"use strict";

// the target is side-effect free and the binding is read only through these
// re-exports, so the binding's own require may render as `0`
const sef = require("../targets/side-effect-free-used");
exports.sef = sef;
exports.value = sef.value;
Object.defineProperty(exports, "getter", { enumerable: true, get: () => sef });
