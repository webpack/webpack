"use strict";

require("./helpers/warmup-webpack");

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");

/**
 * @typedef {object} RoundTripStep
 * @property {string} path absolute output directory of this step
 * @property {string[]} assets emitted asset names
 * @property {(name: string) => string} readText reads an emitted asset as utf-8 text
 */

/** @typedef {import("..").Configuration} Configuration */
/** @typedef {import("..").Stats} Stats */

const JS_ASSET = /\.[cm]?js$/;

/**
 * @param {Configuration} config webpack configuration
 * @returns {Promise<Stats>} stats
 */
const compile = (config) => {
	const webpack = require("..");

	return new Promise((resolve, reject) => {
		webpack(config, (err, stats) => {
			if (err) return reject(err);
			resolve(/** @type {Stats} */ (stats));
		});
	});
};

/**
 * @param {Stats} stats stats
 * @returns {string[]} emitted asset names
 */
const assetsOf = (stats) =>
	(stats.toJson({ all: false, assets: true }).assets || []).map((a) => a.name);

/**
 * Re-bundles each case's output through webpack again and asserts the second
 * pass compiles cleanly and re-emits the same non-JS assets — i.e. the first
 * pass produced output that webpack itself can still statically analyze.
 * @param {{ name: string }} options options
 * @returns {void}
 */
const describeCases = (options) => {
	const casesDir = path.join(__dirname, "roundTripCases");

	describe(options.name, () => {
		for (const category of fs.readdirSync(casesDir)) {
			const categoryDir = path.join(casesDir, category);
			if (!fs.statSync(categoryDir).isDirectory()) continue;

			describe(category, () => {
				for (const testName of fs.readdirSync(categoryDir)) {
					const testDir = path.join(categoryDir, testName);
					if (!fs.statSync(testDir).isDirectory()) continue;

					it(`${testName} should re-bundle through webpack`, async () => {
						const outDir = path.join(
							__dirname,
							"js",
							options.name,
							category,
							testName
						);
						rimraf.sync(outDir);

						/** @type {Configuration} */
						const caseConfig = require(path.join(testDir, "webpack.config.js"));

						const filename =
							(caseConfig.output && caseConfig.output.filename) || "bundle.js";

						/**
						 * @param {number} step step index
						 * @param {string} context entry context
						 * @param {string} entry entry request
						 * @returns {Configuration} configuration for this step
						 */
						const stepConfig = (step, context, entry) => ({
							mode: "development",
							devtool: false,
							...caseConfig,
							context,
							entry,
							output: {
								...caseConfig.output,
								path: path.join(outDir, `${step}`)
							}
						});

						const stats0 = await compile(stepConfig(0, testDir, "./index.js"));
						expect(stats0.hasErrors()).toBe(false);
						const out0 = path.join(outDir, "0");

						// Feed the emitted entry bundle back into webpack.
						const stats1 = await compile(stepConfig(1, out0, `./${filename}`));
						expect(stats1.hasErrors()).toBe(false);
						const out1 = path.join(outDir, "1");

						// Non-JS assets (the analyzable references) must survive the round trip.
						/**
						 * @param {Stats} stats stats
						 * @returns {string[]} sorted non-JS asset names
						 */
						const nonJs = (stats) =>
							assetsOf(stats)
								.filter((name) => !JS_ASSET.test(name))
								.sort();
						expect(nonJs(stats1)).toEqual(nonJs(stats0));

						const testFile = path.join(testDir, "test.js");
						if (fs.existsSync(testFile)) {
							/** @type {(steps: RoundTripStep[]) => void} */
							const assertFn = require(testFile);

							/**
							 * @param {Stats} stats stats
							 * @param {string} dir output dir
							 * @returns {RoundTripStep} step
							 */
							const toStep = (stats, dir) => ({
								path: dir,
								assets: assetsOf(stats),
								readText: (name) =>
									fs.readFileSync(path.join(dir, name), "utf8")
							});
							assertFn([toStep(stats0, out0), toStep(stats1, out1)]);
						}
					}, 60000);
				}
			});
		}
	});
};

// eslint-disable-next-line jest/no-export
module.exports.describeCases = describeCases;
