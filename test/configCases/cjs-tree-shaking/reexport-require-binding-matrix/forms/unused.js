"use strict";

const pure = require("../targets/pure?unused");
const effect = require("../targets/effect?unused");
exports.pureWhole = pure;
exports.pureMember = pure.value;
Object.defineProperty(exports, "pureValue", { enumerable: true, value: pure });
Object.defineProperty(exports, "pureGetter", { enumerable: true, get: () => pure });
exports.effectWhole = effect;
exports.kept = "kept";
