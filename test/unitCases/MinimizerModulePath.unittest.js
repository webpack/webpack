"use strict";

const path = require("path");
const MinimizerPlugin = require("minimizer-webpack-plugin");
const { canMinifyByPath } = /** @type {EXPECTED_ANY} */ (
	// @ts-expect-error -- the plugin does not publish declarations for this test hook
	require("minimizer-webpack-plugin/dist/implementation")
);
const webpack = require("../..");

describe("default minimizer module paths", () => {
	/**
	 * @param {import("../..").Configuration} config configuration
	 * @returns {EXPECTED_ANY} raw minimizer options
	 */
	const getRawOptions = (config) => {
		const originalApply = MinimizerPlugin.prototype.apply;
		/** @type {EXPECTED_ANY} */
		let rawOptions;
		MinimizerPlugin.prototype.apply = function () {
			rawOptions = /** @type {EXPECTED_ANY} */ (this).rawOptions;
		};
		try {
			webpack({ ...config, mode: "production" });
		} finally {
			MinimizerPlugin.prototype.apply = originalApply;
		}
		return rawOptions;
	};

	const expectModulePathDispatch = (/** @type {EXPECTED_ANY} */ rawOptions) => {
		expect(rawOptions).toBeDefined();
		const implementations = Array.isArray(rawOptions.minify)
			? rawOptions.minify
			: [rawOptions.minify];
		expect(
			implementations.every(
				(/** @type {EXPECTED_ANY} */ implementation) =>
					typeof implementation === "string" ||
						(implementation && typeof implementation.path === "string")
			)
		).toBe(true);
		// This is the plugin's exact guard for worker.minify. A function,
		// function-valued option, or mixed implementation would make it false.
		expect(canMinifyByPath({
			minimizer: {
				implementation: rawOptions.minify,
				options: rawOptions.minimizerOptions || {}
			}
		})).toBe(true);
	};

	it("keeps the JavaScript task on the module-path dispatch", () => {
		expectModulePathDispatch(
			getRawOptions({
				entry: path.resolve(__dirname, "../../package.json"),
				experiments: { css: false, html: false }
			})
		);
	});

	it("passes the CSS and HTML minifiers as functions, not module paths", () => {
		const rawOptions = getRawOptions({
			entry: path.resolve(__dirname, "../../package.json"),
			experiments: { css: true, html: true }
		});
		// Loaded by path, they become children of the plugin's module, and their
		// `require("webpack")` pulls all of webpack into the cache's build dependencies.
		expect(rawOptions.minify).toContain(require("../../lib/css/cssMinify"));
		expect(rawOptions.minify).toContain(require("../../lib/html/htmlMinify"));
	});
});
