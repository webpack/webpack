"use strict";

// Bun's `node:vm` hides the sandbox timer globals, so jest-circus captures
// `setTimeout` as undefined and every test aborts; restore them. No-op elsewhere.
if (typeof setTimeout === "undefined") {
	const timers = require("timers");

	for (const key of [
		"setTimeout",
		"clearTimeout",
		"setInterval",
		"clearInterval",
		"setImmediate",
		"clearImmediate",
		"queueMicrotask"
	]) {
		if (typeof globalThis[key] === "undefined" && timers[key]) {
			globalThis[key] = timers[key];
		}
	}
}
