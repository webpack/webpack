"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "known-getter",
		// node side known to expose `process.getBuiltinModule()` (>= 22.3)
		target: ["node22.3", "web"],
		output: { module: true }
	},
	{
		name: "unknown-getter",
		// node side may predate the getter: keep the static import it can read
		target: ["node", "web"],
		output: { module: true }
	}
];
