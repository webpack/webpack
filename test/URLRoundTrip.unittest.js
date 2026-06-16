"use strict";

require("./helpers/warmup-webpack");

const fs = require("fs");
const os = require("os");
const path = require("path");

/**
 * @param {import("..").Configuration} config webpack configuration
 * @returns {Promise<import("../lib/Stats")>} stats
 */
const compile = (config) => {
	const webpack = require("..");

	return new Promise((resolve, reject) => {
		webpack(config, (err, stats) => {
			if (err) return reject(err);
			resolve(/** @type {import("../lib/Stats")} */ (stats));
		});
	});
};

/**
 * @param {string} dir output directory
 * @param {string} context entry context
 * @param {string} entry entry request
 * @returns {import("..").Configuration} webpack configuration emitting analyzable ESM output
 */
const analyzableConfig = (dir, context, entry) => ({
	mode: "development",
	devtool: false,
	target: "node",
	context,
	entry,
	experiments: { outputModule: true },
	output: {
		module: true,
		library: { type: "module" },
		path: dir,
		publicPath: "auto",
		assetModuleFilename: "[name][ext]",
		filename: "bundle.mjs"
	},
	module: { rules: [{ test: /\.png$/, type: "asset/resource" }] }
});

describe("URLRoundTrip", () => {
	// Re-bundling stacks the `/* asset import */` comment, so allow one or more.
	const ANALYZABLE =
		/new URL\((?:\/\* asset import \*\/ )+"\.\/logo\.png", import\.meta\.url\)/;

	it("re-bundles its own analyzable `new URL` output through webpack", async () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "wp-url-roundtrip-"));
		const src = path.join(root, "src");
		const outA = path.join(root, "out-a");
		const outB = path.join(root, "out-b");
		fs.mkdirSync(src, { recursive: true });
		fs.writeFileSync(path.join(src, "logo.png"), "ROUND-TRIP-PNG");
		fs.writeFileSync(
			path.join(src, "index.js"),
			'export const logo = new URL("./logo.png", import.meta.url);\n'
		);

		// First build: produces the analyzable literal + the emitted asset.
		const statsA = await compile(analyzableConfig(outA, src, "./index.js"));
		expect(statsA.hasErrors()).toBe(false);
		const bundleA = fs.readFileSync(path.join(outA, "bundle.mjs"), "utf8");
		expect(bundleA).toMatch(ANALYZABLE);
		expect(fs.existsSync(path.join(outA, "logo.png"))).toBe(true);

		// Second build: feed the emitted bundle back in. webpack must statically
		// detect the `new URL` asset, re-resolve it next to the bundle, and re-emit it.
		const statsB = await compile(analyzableConfig(outB, outA, "./bundle.mjs"));
		expect(statsB.hasErrors()).toBe(false);
		expect(fs.existsSync(path.join(outB, "logo.png"))).toBe(true);
		expect(fs.readFileSync(path.join(outB, "logo.png"), "utf8")).toBe(
			"ROUND-TRIP-PNG"
		);
		const bundleB = fs.readFileSync(path.join(outB, "bundle.mjs"), "utf8");
		expect(bundleB).toMatch(ANALYZABLE);

		fs.rmSync(root, { recursive: true, force: true });
	}, 60000);
});
