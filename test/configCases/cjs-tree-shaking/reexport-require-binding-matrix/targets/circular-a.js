"use strict";

exports.name = "a";
const b = require("./circular-b");
exports.b = b;
exports.bName = b.name;
Object.defineProperty(exports, "lazyB", { enumerable: true, get: () => b });
