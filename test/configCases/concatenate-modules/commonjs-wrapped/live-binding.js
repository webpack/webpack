"use strict";

let v = 0;
Object.defineProperty(exports, "v", { enumerable: true, get: () => v });
exports.set = (n) => {
	v = n;
};
