"use strict";

const ns = require("../targets/cjs?identity");
exports.ns = ns;
Object.defineProperty(exports, "getterNs", { enumerable: true, get: () => ns });
exports.isSame = () => require("../targets/cjs?identity") === ns;
