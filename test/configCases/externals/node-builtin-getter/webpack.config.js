"use strict";

/** @type {(name: string, target: string) => import("../../../../").Configuration} */
const config = (name, target) => ({
	name,
	target,
	output: { module: true },
	externalsType: "node-commonjs",
	externals: {
		join: ["path", "join"],
		// not a core module: still loaded through `createRequire`
		external: "tapable"
	}
});

module.exports = [
	// node version known to expose `process.getBuiltinModule()` (>= 22.3)
	config("known-getter", "node22.3"),
	// node version predating it -> `createRequire`
	config("fallback", "node18")
];
