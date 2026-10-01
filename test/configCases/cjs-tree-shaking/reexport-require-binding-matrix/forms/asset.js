"use strict";

const text = require("../targets/text.txt");
exports.text = text;
Object.defineProperty(exports, "lazyText", { enumerable: true, get: () => text });
