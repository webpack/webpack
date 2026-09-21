"use strict";

// Every library type reads the merged exports object the bootstrap built, so
// what this builds is one library per type for `1-use` to read back.
/** @type {{ entryExports: "all" }} */
const LIBRARY = { entryExports: "all" };

/**
 * @param {string} type library type
 * @param {string=} name library name, where the type needs one
 * @returns {import("../../../../").Configuration} config
 */
const script = (type, name) => ({
	entry: ["./a.js", "./b.js"],
	target: "node14",
	output: {
		uniqueName: type,
		filename: `${type}.js`,
		library: { ...LIBRARY, name, type }
	}
});

/**
 * @param {string} type library type
 * @returns {import("../../../../").Configuration} config
 */
const esm = (type) => ({
	entry: ["./a.js", "./b.js"],
	target: "node14",
	experiments: { outputModule: true },
	output: {
		uniqueName: type,
		filename: `${type}.mjs`,
		module: true,
		library: { ...LIBRARY, type }
	}
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	script("var", "MergedLib"),
	script("assign", "MergedLib"),
	script("assign-properties", "MergedLib"),
	script("this", "MergedLib"),
	script("window", "MergedLib"),
	script("self", "MergedLib"),
	script("global", "MergedLib"),
	script("jsonp", "MergedLib"),
	script("system", "MergedLib"),
	script("amd", "MergedLib"),
	script("amd-require"),
	script("commonjs"),
	script("commonjs2"),
	script("commonjs-module"),
	script("commonjs-static"),
	script("umd", "MergedUmd"),
	script("umd2", "MergedUmd2"),
	esm("module"),
	esm("modern-module")
];
