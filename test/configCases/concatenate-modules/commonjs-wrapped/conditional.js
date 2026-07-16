"use strict";

if (typeof globalThis !== "undefined" && globalThis.__neverTrue) {
	module.exports = { branch: "a" };
} else {
	module.exports = { branch: "b" };
}
