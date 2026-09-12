"use strict";

const path = require("path");
const { pathToFileURL } = require("url");
const { Volume, createFsFromVolume } = require("memfs");
const webpack = require("../lib/index");

/** @import { OutputFileSystem } from "../lib/util/fs" */
/** @import { ModuleId } from "../lib/ChunkGraph" */

const context = path.resolve(__dirname, "fixtures");

/**
 * Builds every module id of a compilation using `HashedModuleIdsPlugin` with
 * the given context.
 * @param {string} pluginContext the plugin's `context` option
 * @param {(err: Error | null, ids?: (ModuleId | undefined)[]) => void} callback called with the sorted ids
 * @returns {void}
 */
const getHashedModuleIds = (pluginContext, callback) => {
	const compiler = webpack({
		mode: "development",
		context,
		entry: "./abc.js",
		output: { path: "/out" },
		// Only the plugin may assign ids, so the context it hashes is observable
		optimization: { moduleIds: false },
		plugins: [new webpack.ids.HashedModuleIdsPlugin({ context: pluginContext })]
	});
	compiler.outputFileSystem = /** @type {OutputFileSystem} */ (
		/** @type {unknown} */ (createFsFromVolume(new Volume()))
	);
	compiler.run((err, stats) => {
		if (err) return callback(err);
		const { modules } = /** @type {import("../lib/Stats")} */ (stats).toJson({
			all: false,
			modules: true,
			ids: true
		});
		const ids =
			/** @type {import("../lib/stats/DefaultStatsFactoryPlugin").StatsModule[]} */ (
				modules
			)
				.map((module) => module.id)
				.sort();
		compiler.close((closeErr) => callback(closeErr || null, ids));
	});
};

describe("file URLs in plugin options", () => {
	describe("HashedModuleIdsPlugin", () => {
		it("should hash the same ids for a context given as a file URL", (done) => {
			getHashedModuleIds(context, (err, fromPath) => {
				if (err) return done(err);
				getHashedModuleIds(
					pathToFileURL(context).href,
					(urlErr, fromFileUrl) => {
						if (urlErr) return done(urlErr);
						expect(fromFileUrl).toEqual(fromPath);
						done();
					}
				);
			});
		});
	});

	describe("ProfilingPlugin", () => {
		it("should convert an output path given as a file URL", () => {
			const outputPath = path.resolve(context, "events.json");
			const plugin = new webpack.debug.ProfilingPlugin({
				outputPath: pathToFileURL(outputPath).href
			});
			expect(plugin.options.outputPath).toBe(outputPath);
		});

		it("should leave a plain output path alone", () => {
			const outputPath = path.resolve(context, "events.json");
			const plugin = new webpack.debug.ProfilingPlugin({ outputPath });
			expect(plugin.options.outputPath).toBe(outputPath);
		});
	});
});
