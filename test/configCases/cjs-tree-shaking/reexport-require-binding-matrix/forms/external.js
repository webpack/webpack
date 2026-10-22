"use strict";

const external = require("matrix-external");
exports.external = external;
exports.a = external.a;
Object.defineProperty(exports, "b", { enumerable: true, get: () => external.b });
