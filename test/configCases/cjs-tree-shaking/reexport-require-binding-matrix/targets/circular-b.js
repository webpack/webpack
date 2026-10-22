"use strict";

exports.name = "b";
const a = require("./circular-a");
exports.a = a;
// `a` is still loading here, so only its first export exists yet
exports.aNameAtLoad = a.name;
exports.aBAtLoad = a.b;
Object.defineProperty(exports, "lazyA", { enumerable: true, get: () => a });
