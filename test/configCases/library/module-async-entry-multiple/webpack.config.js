"use strict";

/** @type {import("../../../../").Configuration[]} */
const configurations = [];

for (const target of ["node", "web", "webworker", "universal"]) {
	for (const startup of ["inline", "split", "runtime"]) {
		for (const lastEntry of ["last", "last-async", "single"]) {
			const name = `${target}-${startup}-${lastEntry}`;
			configurations.push({
				name,
				mode: "development",
				devtool: false,
				target: [target, "es2022"],
				entry: {
					main: "./index.js",
					library: {
						import:
							lastEntry === "single"
								? "./single.js"
								: ["./first.js", `./${lastEntry}.js`],
						library: { type: "module" }
					}
				},
				output: {
					module: true,
					filename: `${name}/[name].mjs`,
					chunkFilename: `${name}/[name].mjs`
				},
				externalsType: "import",
				externals: { library: "./library.mjs" },
				optimization: {
					runtimeChunk: startup === "runtime" ? "single" : false,
					splitChunks: startup === "split" && {
						cacheGroups: {
							state: {
								test: /state\.js$/,
								name: "state",
								chunks: "all",
								enforce: true
							}
						}
					}
				}
			});
		}
	}
}

module.exports = configurations;
