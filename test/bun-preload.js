"use strict";

// Bun-only jest preloader (loaded via `bun --preload` from the bun test script).
//
// jest cannot start under Bun because Bun's `node:` built-ins expose different
// property descriptors than Node. jest-runtime builds a mocked module class as,
// roughly:
//
//   class Mock extends require("node:module").Module {}
//   for (const [key, value] of Object.entries(Module)) Mock[key] = value;
//
// On Node `Module.prototype` is non-enumerable, so the copy loop skips it. On
// Bun it is enumerable, so the loop reaches `Mock.prototype = value`, which
// always throws ("Attempted to assign to readonly property" — a class's
// `prototype` is read-only). Bun also exposes a few statics (`_resolveFilename`,
// `runMain`, `wrapper`) as getter-only accessors, which throw the same way.
//
// Realign those descriptors with Node so the copy loop succeeds.

const nodeModule = require("node:module");

// Statics Node keeps non-enumerable; hide them so `Object.entries` skips them.
const HIDDEN = new Set(["prototype", "length", "name", "arguments", "caller"]);

const align = (target) => {
	if (!target) return;
	for (const key of Object.getOwnPropertyNames(target)) {
		const d = Object.getOwnPropertyDescriptor(target, key);
		if (!d || !d.configurable) continue;
		if (HIDDEN.has(key)) {
			if (d.enumerable) {
				d.enumerable = false;
				Object.defineProperty(target, key, d);
			}
		} else if (d.get || d.set) {
			let value;
			try {
				value = d.get ? d.get.call(target) : undefined;
			} catch (_err) {
				value = undefined;
			}
			Object.defineProperty(target, key, {
				value,
				writable: true,
				enumerable: d.enumerable,
				configurable: true
			});
		} else if (d.writable === false) {
			d.writable = true;
			Object.defineProperty(target, key, d);
		}
	}
};

align(nodeModule.Module);
