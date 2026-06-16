"use strict";

require("./helpers/warmup-webpack");

const fs = require("fs");
const os = require("os");
const path = require("path");

/**
 * @param {import("..").Configuration} config webpack configuration
 * @returns {Promise<import("..").Stats>} stats
 */
const compile = (config) => {
	const webpack = require("..");

	return new Promise((resolve, reject) => {
		webpack(config, (err, stats) => {
			if (err) return reject(err);
			resolve(/** @type {import("..").Stats} */ (stats));
		});
	});
};

/**
 * @param {object} options options
 * @param {string} options.dir output directory
 * @param {string} options.context entry context
 * @param {string} options.entry entry request
 * @param {string=} options.publicPath publicPath
 * @param {"relative"=} options.url javascript `url` parser mode
 * @returns {import("..").Configuration} webpack configuration with ESM module output
 */
const config = ({ dir, context, entry, publicPath = "auto", url }) => ({
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
		publicPath,
		assetModuleFilename: "[name][ext]",
		filename: "bundle.mjs"
	},
	module: {
		parser: url ? { javascript: { url } } : {},
		rules: [{ test: /\.png$/, type: "asset/resource" }]
	}
});

describe("URL analyzable ESM output", () => {
	// Re-bundling stacks the `/* asset import */` comment, so allow one or more.
	const ANALYZABLE =
		/new URL\((?:\/\* asset import \*\/ )+"\.\/logo\.png", import\.meta\.url\)/;

	/** @type {string} */
	let root;
	/** @type {string} */
	let src;

	beforeEach(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), "wp-url-"));
		src = path.join(root, "src");
		fs.mkdirSync(src, { recursive: true });
		fs.writeFileSync(path.join(src, "logo.png"), "ROUND-TRIP-PNG");
		fs.writeFileSync(
			path.join(src, "index.js"),
			'export const logo = new URL("./logo.png", import.meta.url);\n'
		);
	});

	afterEach(() => {
		fs.rmSync(root, { recursive: true, force: true });
	});

	it("re-bundles its own `new URL` output through webpack", async () => {
		const outA = path.join(root, "out-a");
		const outB = path.join(root, "out-b");

		// First build: analyzable literal + emitted asset.
		const statsA = await compile(
			config({ dir: outA, context: src, entry: "./index.js" })
		);
		expect(statsA.hasErrors()).toBe(false);
		expect(fs.readFileSync(path.join(outA, "bundle.mjs"), "utf8")).toMatch(
			ANALYZABLE
		);
		expect(fs.existsSync(path.join(outA, "logo.png"))).toBe(true);

		// Second build: feed the emitted bundle back in — webpack must statically
		// detect the asset, re-resolve it next to the bundle, and re-emit it.
		const statsB = await compile(
			config({ dir: outB, context: outA, entry: "./bundle.mjs" })
		);
		expect(statsB.hasErrors()).toBe(false);
		expect(fs.readFileSync(path.join(outB, "logo.png"), "utf8")).toBe(
			"ROUND-TRIP-PNG"
		);
		expect(fs.readFileSync(path.join(outB, "bundle.mjs"), "utf8")).toMatch(
			ANALYZABLE
		);
	}, 60000);

	it("drops the asset's JS wrapper for an absolute publicPath", async () => {
		const out = path.join(root, "out");
		const stats = await compile(
			config({
				dir: out,
				context: src,
				entry: "./index.js",
				publicPath: "https://cdn.example.com/assets/"
			})
		);
		expect(stats.hasErrors()).toBe(false);
		const bundle = fs.readFileSync(path.join(out, "bundle.mjs"), "utf8");

		expect(bundle).toMatch(
			/new URL\(\/\* asset import \*\/ "https:\/\/cdn\.example\.com\/assets\/logo\.png", import\.meta\.url\)/
		);
		// asset is consumed as `asset-url`: no wrapper, no publicPath runtime global
		expect(bundle).not.toContain(`${"__webpack_require__"}.p`);
		expect(fs.existsSync(path.join(out, "logo.png"))).toBe(true);
	}, 60000);

	it("keeps the runtime form for relative url mode", async () => {
		const out = path.join(root, "out");
		const stats = await compile(
			config({ dir: out, context: src, entry: "./index.js", url: "relative" })
		);
		expect(stats.hasErrors()).toBe(false);
		const bundle = fs.readFileSync(path.join(out, "bundle.mjs"), "utf8");

		// relative mode keeps its RelativeURL polyfill instead of the literal form
		expect(bundle).toContain(`${"__webpack_require__"}.U`);
		expect(bundle).not.toMatch(ANALYZABLE);
	}, 60000);
});
