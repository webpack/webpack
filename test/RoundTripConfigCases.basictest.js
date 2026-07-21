"use strict";

require("./helpers/warmup-webpack");

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");

/** @typedef {import("..").Configuration} Configuration */
/** @typedef {import("..").Stats} Stats */

const JS_ASSET = /\.[cm]?js$/;
const casesPath = path.join(__dirname, "configCases");

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
 * @param {Stats} stats stats
 * @returns {string | undefined} the emitted entry bundle name
 */
const entryBundleOf = (stats) => {
	const { entrypoints } = stats.toJson({ all: false, entrypoints: true });
	const entrypoint =
		entrypoints && (entrypoints.main || Object.values(entrypoints)[0]);
	if (!entrypoint) return undefined;
	return (entrypoint.assets || [])
		.map((a) => a.name)
		.find((name) => JS_ASSET.test(name));
};

// Re-bundles the output of every `configCases` case marked `roundTrip: true` and
// asserts the second pass compiles and re-emits the same non-JS assets — i.e. the
// first pass produced output that webpack itself can still statically analyze.
describe("RoundTripConfigCases", () => {
	for (const category of fs.readdirSync(casesPath)) {
		const categoryDir = path.join(casesPath, category);
		if (!fs.statSync(categoryDir).isDirectory()) continue;

		describe(category, () => {
			for (const testName of fs.readdirSync(categoryDir)) {
				const testDir = path.join(categoryDir, testName);
				if (!fs.statSync(testDir).isDirectory()) continue;

				const testConfigPath = path.join(testDir, "test.config.js");
				if (!fs.existsSync(testConfigPath)) continue;

				const testConfig = require(testConfigPath);

				if (!testConfig.roundTrip) continue;

				const filterPath = path.join(testDir, "test.filter.js");
				if (fs.existsSync(filterPath) && !require(filterPath)()) continue;

				it(`${testName} should re-bundle through webpack`, async () => {
					const outDir = path.join(
						__dirname,
						"js",
						"RoundTripConfigCases",
						category,
						testName
					);
					rimraf.sync(outDir);

					const raw = require(path.join(testDir, "webpack.config.js"));

					/** @type {Configuration} */
					const caseConfig =
						typeof raw === "function" ? raw({}, { testPath: outDir }) : raw;
					if (Array.isArray(caseConfig)) {
						throw new Error(
							"roundTrip does not support multi-compiler configs"
						);
					}

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
					const entry = entryBundleOf(stats0);
					expect(entry).toBeDefined();

					// Feed the emitted entry bundle back into webpack.
					const stats1 = await compile(
						stepConfig(1, path.join(outDir, "0"), `./${entry}`)
					);
					expect(stats1.hasErrors()).toBe(false);

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
				}, 60000);
			}
		});
	}
});
