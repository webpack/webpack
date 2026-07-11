"use strict";

// Bun's `node:vm` sandbox is missing the host's web/runtime globals: jest
// installs them via jest-environment-node's GlobalProxy getters, which Bun does
// not surface through the sandbox `globalThis`. So jest-circus and webpack see
// `setTimeout`/`URL`/`TextEncoder`/etc. as undefined and tests abort. Restore
// them from node builtins. Runs as a jest `setupFiles` entry (in-sandbox, before
// the framework loads); no-op on Node/Deno where the globals already exist.
if (typeof URL === "undefined" || typeof setTimeout === "undefined") {
	const restore = (request, names) => {
		let mod;
		try {
			mod = require(request);
		} catch {
			return;
		}
		for (const name of names) {
			if (typeof globalThis[name] === "undefined" && mod[name] !== undefined) {
				globalThis[name] = mod[name];
			}
		}
	};

	restore("node:timers", [
		"setTimeout",
		"clearTimeout",
		"setInterval",
		"clearInterval",
		"setImmediate",
		"clearImmediate"
	]);
	restore("node:url", ["URL", "URLSearchParams"]);
	restore("node:util", ["TextEncoder", "TextDecoder"]);
	restore("node:buffer", ["Blob", "File", "atob", "btoa"]);
	restore("node:perf_hooks", ["performance"]);
	restore("node:stream/web", [
		"ReadableStream",
		"WritableStream",
		"TransformStream"
	]);
	restore("node:worker_threads", [
		"MessageChannel",
		"MessagePort",
		"BroadcastChannel"
	]);

	// `crypto` is exposed as `webcrypto` by node:crypto.
	if (typeof globalThis.crypto === "undefined") {
		try {
			// eslint-disable-next-line n/prefer-global/crypto
			globalThis.crypto = require("node:crypto").webcrypto;
		} catch {
			// no crypto available
		}
	}

	// queueMicrotask has no builtin export; polyfill via the microtask queue.
	if (typeof globalThis.queueMicrotask === "undefined") {
		globalThis.queueMicrotask = (callback) => Promise.resolve().then(callback);
	}
}
