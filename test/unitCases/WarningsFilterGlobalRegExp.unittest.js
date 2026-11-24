"use strict";

require("../helpers/warmup-webpack");

const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");
const webpack = require("../../");
const deprecationTracking = require("../helpers/deprecationTracking");

const PLUGIN_NAME = "RepeatedWarningsPlugin";

/**
 * Builds a compilation that carries one filtered and one kept warning.
 * @returns {Promise<import("../../").Stats>} the stats of the build
 */
const build = () =>
	new Promise((resolve, reject) => {
		const compiler = webpack({
			mode: "development",
			context: path.join(
				__dirname,
				"../statsCases/ignore-warnings-global-regexp"
			),
			entry: "./index.js",
			plugins: [
				{
					/**
					 * @param {import("../../").Compiler} compiler the compiler
					 * @returns {void}
					 */
					apply(compiler) {
						compiler.hooks.thisCompilation.tap(
							PLUGIN_NAME,
							(compilation) => {
								compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
									compilation.warnings.push(
										new webpack.WebpackError("delta warning")
									);
									compilation.warnings.push(
										new webpack.WebpackError("kept warning")
									);
								});
							}
						);
					}
				}
			]
		});
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		compiler.run((err, stats) => {
			compiler.close((closeErr) => {
				if (err) return reject(err);
				if (closeErr) return reject(closeErr);
				resolve(/** @type {import("../../").Stats} */ (stats));
			});
		});
	});

describe("warningsFilter with a global or sticky regexp", () => {
	it("filters a warning with a global regexp that was already used", async () => {
		const tracker = deprecationTracking.start();
		const stats = await build();
		const filter = /delta warning/g;
		// The regexp was already used elsewhere, so its `lastIndex` is not 0.
		filter.exec("delta warning and delta warning");
		const text = stats.toString({ warningsFilter: [filter] });
		expect(tracker().map(({ code }) => code)).toEqual([
			"DEP_WEBPACK_STATS_WARNINGS_FILTER"
		]);
		expect(text.match(/delta warning/g) || []).toHaveLength(0);
		expect(text.match(/kept warning/g) || []).toHaveLength(1);
	});

	it("excludes modules with a global regexp that was already used", async () => {
		const stats = await build();
		const filter = /module\.js/g;
		// The regexp was already used elsewhere, so its `lastIndex` is past
		// the place where the pattern occurs in a module identifier.
		filter.lastIndex = 1000;
		const text = stats.toString({
			all: false,
			modules: true,
			excludeModules: [filter]
		});
		expect(text).not.toContain("./module.js");
		expect(text).toContain("./index.js");
	});

	it("filters a warning with a sticky regexp that was already used", async () => {
		const tracker = deprecationTracking.start();
		const stats = await build();
		const filter = /delta warning/y;
		// The regexp was already used elsewhere, so its `lastIndex` is not 0.
		filter.exec("delta warning");
		const text = stats.toString({ warningsFilter: [filter] });
		expect(tracker().map(({ code }) => code)).toEqual([
			"DEP_WEBPACK_STATS_WARNINGS_FILTER"
		]);
		expect(text.match(/delta warning/g) || []).toHaveLength(0);
		expect(text.match(/kept warning/g) || []).toHaveLength(1);
	});
});
