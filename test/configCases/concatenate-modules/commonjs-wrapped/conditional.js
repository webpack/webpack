"use strict";

if (globalThis.__neverTrue) {
	module.exports = { branch: "a" };
} else {
	module.exports = { branch: "b" };
}
