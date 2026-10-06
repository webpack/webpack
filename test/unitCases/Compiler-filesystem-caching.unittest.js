"use strict";

require("../helpers/warmup-webpack");

// Switching devtool between two compilers on one disk cache needs a compiler
// per option set, which neither the config nor the watch harness provides.
const path = require("path");
const testDirectory = path.resolve(__dirname, "..");
const fs = require("graceful-fs");
const rimraf = /** @type {{ sync: (path: string) => void }} */ (
	require("rimraf")
);
const expectNoDeprecations = require("../helpers/expectNoDeprecations");

describe("Compiler (filesystem caching, css devtool)", () => {
	expectNoDeprecations();

	const cachePath = path.join(
		testDirectory,
		"fixtures",
		"temp-css-devtool-cache-fixture"
	);

	beforeEach(() => {
		rimraf.sync(cachePath);
	});

	afterEach(() => {
		rimraf.sync(cachePath);
	});

	/**
	 * @param {import("../../declarations/WebpackOptions").DevTool} devtool devtool to build with
	 * @param {string=} devtoolModuleFilenameTemplate template to build with
	 * @returns {Promise<string>} the emitted bundle
	 */
	function build(devtool, devtoolModuleFilenameTemplate) {
		const webpack = require("../..");

		return new Promise((resolve, reject) => {
			const compiler = webpack({
				context: path.join(testDirectory, "fixtures", "css-devtool-cache"),
				entry: "./index.js",
				mode: "development",
				devtool,
				target: "web",
				experiments: { css: true },
				cache: { type: "filesystem", cacheDirectory: cachePath },
				module: {
					rules: [
						{
							test: /\.css$/,
							type: "css/auto",
							parser: { exportType: "text" }
						}
					]
				},
				output: {
					path: path.join(cachePath, "dist"),
					filename: "bundle.js",
					devtoolModuleFilenameTemplate
				}
			});

			compiler.run((err, stats) => {
				if (err) return reject(err);
				if (/** @type {import("../../types").Stats} */ (stats).hasErrors()) {
					return reject(
						new Error(
							/** @type {import("../../types").Stats} */ (stats).toString()
						)
					);
				}
				compiler.close(() => {
					resolve(
						fs
							.readFileSync(path.join(cachePath, "dist", "bundle.js"))
							.toString()
					);
				});
			});
		});
	}

	const INLINE_MAP_REGEXP = /sourceMappingURL=data:application\/json/;

	it("should not reuse an inlined css map for a hidden devtool", async () => {
		expect(await build("source-map")).toMatch(INLINE_MAP_REGEXP);
		expect(await build("hidden-source-map")).not.toMatch(INLINE_MAP_REGEXP);
	});

	it("should not reuse a hidden result for a non-hidden devtool", async () => {
		expect(await build("hidden-source-map")).not.toMatch(INLINE_MAP_REGEXP);
		expect(await build("source-map")).toMatch(INLINE_MAP_REGEXP);
	});

	it("should not reuse inlined css map names for another template", async () => {
		await build("source-map");

		const bundle = await build(
			"source-map",
			"webpack://custom/[resource-path]"
		);
		const match =
			/sourceMappingURL=data:application\/json;charset=utf-8;base64,([\w+/=]+)/.exec(
				bundle
			);
		const map = JSON.parse(
			Buffer.from(/** @type {RegExpExecArray} */ (match)[1], "base64").toString(
				"utf8"
			)
		);

		expect(map.sources).toContain("webpack://custom/./style.css");
	});

	it("should not reuse sources of an inlined css map for nosources", async () => {
		await build("source-map");

		const bundle = await build("nosources-source-map");
		const match =
			/sourceMappingURL=data:application\/json;charset=utf-8;base64,([\w+/=]+)/.exec(
				bundle
			);
		const map = JSON.parse(
			Buffer.from(/** @type {RegExpExecArray} */ (match)[1], "base64").toString(
				"utf8"
			)
		);

		expect(map.sourcesContent).toBeUndefined();
	});
});
