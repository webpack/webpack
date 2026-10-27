"use strict";

const path = require("path");
const { pathToFileURL } = require("url");
const { getNormalizedWebpackOptions } = require("../../lib/config/normalization");

describe("getNormalizedWebpackOptions", () => {
	describe("file URLs", () => {
		const directory = path.resolve("/dir");
		const url = pathToFileURL(directory).href;

		it("converts the options that take an absolute path", () => {
			const options = getNormalizedWebpackOptions({
				context: url,
				output: { path: url },
				recordsPath: url,
				cache: {
					type: "filesystem",
					cacheDirectory: url,
					cacheLocation: url
				},
				snapshot: {
					immutablePaths: [url],
					managedPaths: [url],
					unmanagedPaths: [url]
				}
			});

			expect(options.context).toBe(directory);
			expect(options.output.path).toBe(directory);
			expect(options.recordsInputPath).toBe(directory);
			expect(options.recordsOutputPath).toBe(directory);
			expect(options.cache).toMatchObject({
				type: "filesystem",
				cacheDirectory: directory,
				cacheLocation: directory
			});
			expect(options.snapshot.immutablePaths).toEqual([directory]);
			expect(options.snapshot.managedPaths).toEqual([directory]);
			expect(options.snapshot.unmanagedPaths).toEqual([directory]);
		});

		it("leaves a plain path and a regular expression alone", () => {
			const expression = /node_modules/;
			const options = getNormalizedWebpackOptions({
				context: directory,
				recordsPath: false,
				snapshot: { managedPaths: [directory, expression] }
			});

			expect(options.context).toBe(directory);
			expect(options.recordsInputPath).toBe(false);
			expect(options.snapshot.managedPaths).toEqual([directory, expression]);
		});
	});

	describe("optimization.minimize.css groups", () => {
		/**
		 * @param {import("../../declarations/WebpackOptions").OptimizationMinimizeCss} css the CSS minimizer options
		 * @returns {unknown} what the minimizer reads
		 */
		const normalize = (css) =>
			/** @type {NonNullable<import("../../declarations/WebpackOptions").OptimizationMinimizeOptions>} */ (
				getNormalizedWebpackOptions({ optimization: { minimize: { css } } })
					.optimization.minimizeOptions
			).css;

		it("sets every switch of a group a boolean names", () => {
			expect(normalize({ merge: false, convert: true })).toEqual({
				mergeRules: false,
				mergeLonghands: false,
				mergeDistantRules: false,
				convertApproximateColors: true,
				convertLengthUnits: true
			});
		});

		it("sets each switch a group object names, over its deprecated name", () => {
			expect(
				normalize({
					shorten: { colors: false, case: false },
					remove: { shadowedDeclarations: false },
					target: { dirSelector: true },
					shortenColors: true,
					shortenNumbers: false,
					comments: false
				})
			).toEqual({
				shortenColors: false,
				foldCase: false,
				removeShadowedDeclarations: false,
				rewriteDirSelector: true,
				shortenNumbers: false,
				comments: false
			});
		});

		it("reads the same groups from minimizeOptions", () => {
			expect(
				getNormalizedWebpackOptions({
					optimization: { minimizeOptions: { css: { resolve: true } } }
				}).optimization.minimizeOptions
			).toEqual({ css: { customMedia: true, customSelectors: true } });
		});
	});
});
