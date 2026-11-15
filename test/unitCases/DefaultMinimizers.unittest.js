"use strict";

const path = require("path");
const MinimizerPlugin = require("minimizer-webpack-plugin");
const webpack = require("../..");

describe("default minimizers", () => {
	/**
	 * @param {import("../..").Configuration} config configuration
	 * @returns {EXPECTED_ANY[]} the minify implementations the default minimizer gets
	 */
	const getImplementations = (config) => {
		const originalApply = MinimizerPlugin.prototype.apply;
		/** @type {EXPECTED_ANY} */
		let rawOptions;
		MinimizerPlugin.prototype.apply = function () {
			rawOptions = /** @type {EXPECTED_ANY} */ (this).rawOptions;
		};
		try {
			webpack({
				...config,
				mode: "production",
				entry: path.resolve(__dirname, "../../package.json")
			});
		} finally {
			MinimizerPlugin.prototype.apply = originalApply;
		}
		return Array.isArray(rawOptions.minify)
			? rawOptions.minify
			: [rawOptions.minify];
	};

	// Loaded by path, a minifier becomes a child of the plugin's module, and its
	// `require("webpack")` brings every module webpack loaded with it.
	it("passes every minifier as a function, never a module path", () => {
		const implementations = getImplementations({
			experiments: { css: true, html: true }
		});
		expect(implementations).toContain(MinimizerPlugin.terserMinify);
		expect(implementations).toContain(require("../../lib/css/cssMinify"));
		expect(implementations).toContain(require("../../lib/html/htmlMinify"));
		for (const implementation of implementations) {
			expect(typeof implementation).toBe("function");
		}
	});

	it("passes webpack's own JavaScript minifier as a function under futureDefaults", () => {
		expect(
			getImplementations({ experiments: { futureDefaults: true } })
		).toContain(require("../../lib/javascript/jsMinify"));
	});
});
