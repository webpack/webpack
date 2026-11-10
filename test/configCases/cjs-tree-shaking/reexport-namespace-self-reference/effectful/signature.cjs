"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.magic = void 0;
exports.wrap = wrap;
const version = require("../version.cjs");
exports.magic = "effectful";
function wrap(value) {
	return `${value}:${exports.magic}:${version.version}`;
}
