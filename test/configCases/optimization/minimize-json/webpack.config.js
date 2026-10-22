"use strict";

const fs = require("fs");
const path = require("path");
const MinimizerPlugin = require("minimizer-webpack-plugin");

/**
 * @param {string} file fixture file name
 * @returns {string} its content as written
 */
const readFixture = (file) =>
	fs.readFileSync(path.join(__dirname, file), "utf8");

const DATA = readFixture("data.json");
const NOT_JSON = readFixture("not-json.json");
const MANIFEST = readFixture("site.webmanifest");
const MINIFIED =
	'{"name":"webpack","list":[1,2,3],"nested":{"empty":{}},"id":9007199254740993,"precise":1.50,"huge":1e400,"text":"keep  \\"these\\"  spaces\\\\"}';

// Declares JSON through `include`, but its `test` keeps it to JavaScript, so the
// plugin never hands it a JSON asset and webpack's own minimizer must.
class JavascriptOnlyMinimizer {
	constructor() {
		this.options = {
			test: /\.js$/,
			include: /\.json$/,
			minimizer: { implementation: () => {} }
		};
	}

	apply() {}
}

/** @typedef {"minified" | "unchanged" | "user" | "user-manifest"} Expected */

/**
 * @param {string} name asset name prefix
 * @param {Expected} expected what the emitted JSON asset should hold
 * @param {import("../../../../").Configuration} options config overrides
 * @returns {import("../../../../").Configuration} config
 */
const config = (name, expected, options) => ({
	target: "node",
	mode: "production",
	...options,
	optimization: {
		// The test harness turns minimizing off and swaps in its own minimizer.
		minimize: true,
		minimizer: ["..."],
		...options.optimization
	},
	output: {
		publicPath: "",
		assetModuleFilename: `${name}-[name][ext]`
	},
	module: {
		rules: [{ test: /\.(?:json|webmanifest)$/, type: "asset/resource" }]
	},
	plugins: [
		...(options.plugins || []),
		/**
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			// Checked here rather than in the bundle: futureDefaults emits ESM,
			// which reaches `fs` through `createRequire`, missing on Node 10.
			compiler.hooks.afterEmit.tap("CheckJsonAssets", (compilation) => {
				/**
				 * @param {string} file asset name suffix
				 * @returns {string} the emitted content
				 */
				const emitted = (file) =>
					fs.readFileSync(
						path.join(
							/** @type {string} */ (compilation.outputOptions.path),
							`${name}-${file}`
						),
						"utf8"
					);
				const data = emitted("data.json");
				const manifest = emitted("site.webmanifest");
				if (expected === "minified") {
					expect(data).toBe(MINIFIED);
					expect(manifest).toBe(
						'{"name":"webpack","icons":[{"src":"icon.png","sizes":"48x48"}]}'
					);
				} else if (expected === "user") {
					expect(data).toBe(JSON.stringify(JSON.parse(data), null, 1));
				} else if (expected === "user-manifest") {
					// Claiming manifests claims JSON, so the built-in one stands aside.
					expect(data).toBe(DATA);
					expect(manifest).toBe(JSON.stringify(JSON.parse(MANIFEST), null, 1));
				} else {
					expect(data).toBe(DATA);
					expect(manifest).toBe(MANIFEST);
				}
				expect(emitted("not-json.json")).toBe(NOT_JSON);
			});
		}
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	config("future-defaults", "minified", {
		experiments: { futureDefaults: true }
	}),
	config("future-defaults-disabled", "unchanged", {
		experiments: { futureDefaults: true },
		optimization: { minimizeOptions: { json: false } }
	}),
	config("default", "unchanged", {}),
	config("opt-in", "minified", {
		optimization: { minimizeOptions: { json: true } }
	}),
	config("test-and-include", "minified", {
		experiments: { futureDefaults: true },
		optimization: { minimizer: ["...", new JavascriptOnlyMinimizer()] }
	}),
	config("user-manifest-minimizer", "user-manifest", {
		experiments: { futureDefaults: true },
		optimization: {
			minimizer: [
				"...",
				new MinimizerPlugin({
					test: /\.webmanifest$/,
					parallel: false,
					/**
					 * @param {Record<string, string | Buffer>} input the one manifest
					 * @returns {Promise<{ code: string }>} it, re-indented
					 */
					minify: async (input) => ({
						code: JSON.stringify(
							JSON.parse(String(Object.values(input)[0])),
							null,
							1
						)
					})
				})
			]
		}
	}),
	config("user-minimizer", "user", {
		experiments: { futureDefaults: true },
		optimization: {
			// Listed after the default one, so without stepping aside the default
			// would minimize first and this one would skip the asset.
			minimizer: [
				"...",
				new MinimizerPlugin({
					test: /\.json$/,
					exclude: /not-json/,
					minify: MinimizerPlugin.jsonMinify,
					minimizerOptions: { space: 1 }
				})
			]
		}
	})
];
