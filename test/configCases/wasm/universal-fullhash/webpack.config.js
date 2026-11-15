"use strict";

/** @type {import("../../../../").Configuration[]} */
const configurations = [];

for (const phase of ["instantiate", "source"]) {
	const entry = phase === "source" ? "./source.js" : "./index.js";
	for (const [name, hash, evalDevtool, overridePublicPath] of [
		["plain", "[fullhash]", true, false],
		["length", "[fullhash:8]", true, false],
		["public-path", "[fullhash]", false, true],
		["baked", "[fullhash]", false, false],
		["module-hash", "[hash]", true, false],
		["digest", "[fullhash:base64safe:8]", true, false]
	]) {
		configurations.push({
			mode: overridePublicPath ? "production" : "development",
			target: "universal",
			devtool: evalDevtool ? "eval" : false,
			entry: overridePublicPath ? ["./public-path.js", entry] : entry,
			module: {
				rules: [
					{
						test: /\.wat$/,
						loader: "wast-loader",
						type: "webassembly/async"
					}
				]
			},
			output: {
				module: true,
				chunkFilename: `${phase}-${name}-[name].mjs`,
				webassemblyModuleFilename: `${phase}-${name}.${hash}.wasm`
			},
			experiments: { asyncWebAssembly: true, sourceImport: true }
		});
	}
}

module.exports = configurations;
