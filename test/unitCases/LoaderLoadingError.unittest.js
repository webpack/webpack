"use strict";

require("../helpers/warmup-webpack");

const path = require("path");
const { createFsFromVolume, Volume } = require("memfs");
const webpack = require("../..");

const context = path.resolve(__dirname, "../fixtures/errors");

/**
 * @param {string} loader the loader request, relative to the fixtures
 * @returns {Promise<import("../../").StatsError[]>} the build's errors
 */
const compileWith = (loader) =>
	new Promise((resolve, reject) => {
		const compiler = webpack({
			context,
			mode: "none",
			entry: `${loader}!./entry-point.js`
		});
		compiler.outputFileSystem = /** @type {import("../../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.run((err, stats) => {
			if (err) return reject(err);
			compiler.close((closeErr) => {
				if (closeErr) return reject(closeErr);
				resolve(
					/** @type {import("../../").StatsError[]} */ (
						/** @type {import("../../").Stats} */ (stats).toJson({
							errorDetails: false
						}).errors
					)
				);
			});
		});
	});

// Not a configCases case: LoaderLoadingError has no serializer, so the
// persistent cache logs "No serializer registered for LoaderLoadingError" in
// ConfigCacheTestCases. Move these to configCases/errors/loader-shapes then.
describe("LoaderLoadingError", () => {
	it("should report a loader exporting an object", async () => {
		const errors = await compileWith("./module-exports-object-loader");
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toMatch(
			/^Module build failed \(from \.\/module-exports-object-loader\.js\):\nLoaderRunnerError: Module '[^']*[\\/]module-exports-object-loader\.js' is not a loader \(must have normal or pitch function\)\n/
		);
	});

	it("should report a loader exporting a string", async () => {
		const errors = await compileWith("./module-exports-string-loader");
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toMatch(
			/^Module build failed \(from \.\/module-exports-string-loader\.js\):\nLoaderRunnerError: Module '[^']*[\\/]module-exports-string-loader\.js' is not a loader \(export function or es6 module\)\n/
		);
	});
});
