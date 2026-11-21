"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");

// every way a file name can lead outside of output.path, each into "routes-out"
const OUT = "../routes-out";

/** @typedef {"unset" | "allowed" | "futureDefaults"} Mode */

/**
 * The files each route writes, read back from the outside directory.
 * @param {string[]} files names in the outside directory
 * @returns {string[]} the routes that wrote no file
 */
const missingRoutes = (files) =>
	Object.entries({
		"entry filename": (/** @type {string} */ f) => f === "entry.js",
		"entry name": (/** @type {string} */ f) => f === "named-entry.js",
		webpackChunkName: (/** @type {string} */ f) => f === "lazy.js",
		cssFilename: (/** @type {string} */ f) => f === "bundle0.css",
		cssChunkFilename: (/** @type {string} */ f) => /^css-.+\.css$/.test(f),
		htmlFilename: (/** @type {string} */ f) => f === "page.html",
		assetModuleFilename: (/** @type {string} */ f) => f === "img.png",
		sourceMapFilename: (/** @type {string} */ f) => f === "bundle0.js.map",
		workerChunkFilename: (/** @type {string} */ f) => /^worker-.+\.js$/.test(f),
		copy: (/** @type {string} */ f) => f === "copied.txt"
	})
		.filter(([, test]) => !files.some(test))
		.map(([route]) => route);

/**
 * A configuration whose every output file name leads outside of output.path.
 * @param {string} testPath the case's output directory
 * @param {Mode} mode how `output.allowOutside` is set
 * @returns {import("../../").Configuration} configuration
 */
module.exports = (testPath, mode) => {
	const outside = path.join(testPath, OUT);
	return {
		target: "web",
		devtool: "source-map",
		// the sources live with the case that runs them unset
		context: path.join(__dirname, "../configCases/output/outside-routes-unset"),
		entry: {
			bundle0: "./index.js",
			[`${OUT}/named-entry`]: "./entry.js",
			other: { import: "./entry.js", filename: `${OUT}/entry.js` },
			page: "./page.html"
		},
		output: {
			// experiments.futureDefaults emits ECMAScript modules
			filename: mode === "futureDefaults" ? "[name].mjs" : "[name].js",
			chunkFilename: "[name].js",
			cssFilename: `${OUT}/[name].css`,
			cssChunkFilename: `${OUT}/css-[id].css`,
			htmlFilename: `${OUT}/[name].html`,
			assetModuleFilename: `${OUT}/[name][ext]`,
			sourceMapFilename: `${OUT}/[file].map`,
			workerChunkFilename: `${OUT}/worker-[id].js`,
			copy: [
				{
					from: path.join(
						__dirname,
						"../configCases/output/outside-routes-unset/copied.txt"
					),
					to: OUT
				}
			],
			...(mode === "allowed" ? { allowOutside: [outside] } : {})
		},
		module: { rules: [{ test: /\.png$/, type: "asset/resource" }] },
		// a refused copy is an error, so each route reaches its own write
		optimization: { emitOnErrors: true },
		experiments: {
			css: true,
			html: true,
			futureDefaults: mode === "futureDefaults"
		},
		plugins: [
			/**
			 * @param {import("../../").Compiler} compiler compiler
			 */
			(compiler) => {
				compiler.hooks.environment.tap("OutsideRoutes", () => {
					rimraf.sync(outside);
				});
				compiler.hooks.afterEmit.tap("OutsideRoutes", (compilation) => {
					const files = fs.existsSync(outside) ? fs.readdirSync(outside) : [];
					const missing = missingRoutes(files);
					const problem =
						mode === "futureDefaults"
							? files.length > 0 && `wrote ${files.join(", ")}`
							: missing.length > 0 && `wrote nothing for ${missing.join(", ")}`;
					if (problem) {
						compilation.errors.push(
							new compiler.webpack.WebpackError(`outside routes: ${problem}`)
						);
					}
				});
			}
		]
	};
};
