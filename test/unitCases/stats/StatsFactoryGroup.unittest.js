"use strict";

require("../../helpers/warmup-webpack");

const path = require("path");
const { createFsFromVolume, Volume } = require("memfs");
const webpack = require("../../..");

/** @import { Compilation, StatsChunk, StatsCompilation } from "../../../" */
/** @typedef {Parameters<Compilation["hooks"]["statsFactory"]["call"]>[0]} StatsFactory */

const PLUGIN = "GroupChunksByInitial";

/**
 * Builds the fixture, letting a plugin tap the stats factory.
 * @param {(factory: StatsFactory) => void} tap taps the compilation's stats factory
 * @returns {Promise<StatsCompilation>} the stats JSON
 */
const statsWith = (tap) =>
	new Promise((resolve, reject) => {
		const compiler = webpack({
			context: path.resolve(__dirname, "../../fixtures/stats-grouping"),
			mode: "none",
			entry: "./index.js"
		});
		compiler.outputFileSystem =
			/** @type {import("../../../").OutputFileSystem} */ (
				/** @type {unknown} */ (createFsFromVolume(new Volume()))
			);
		compiler.hooks.compilation.tap(PLUGIN, (compilation) => {
			compilation.hooks.statsFactory.tap(PLUGIN, tap);
		});
		compiler.run((err, stats) => {
			if (err) return reject(err);
			compiler.close((closeErr) => {
				if (closeErr) return reject(closeErr);
				resolve(
					/** @type {import("../../../").Stats} */ (stats).toJson({
						all: false,
						chunks: true,
						ids: true
					})
				);
			});
		});
	});

describe("StatsFactory groups", () => {
	it("groups the items of a path that declares no group type", async () => {
		const stats = await statsWith((factory) => {
			factory.hooks.groupResults
				.for("compilation.chunks")
				.tap(PLUGIN, (groupConfigs) => {
					groupConfigs.push({
						getKeys: (chunk) => [chunk.initial ? "initial" : "async"],
						getOptions: () => ({ force: true }),
						createGroup: (key, children) => ({
							type: "chunks by loading",
							loading: key,
							children
						})
					});
				});
		});
		// The groups take the chunks' place in the list.
		const groups = /** @type {StatsChunk[]} */ (stats.chunks);
		expect(groups.map((group) => [group.type, group.loading])).toEqual([
			["chunks by loading", "initial"],
			["chunks by loading", "async"]
		]);
		for (const group of groups) {
			expect(group.children).toHaveLength(1);
		}
	});

	it("refuses a group that the stats JSON cannot hold", () => {
		/** @param {StatsFactory} factory the stats factory */
		const tap = (factory) => {
			factory.hooks.groupResults
				.for("compilation.chunks")
				.tap(PLUGIN, (groupConfigs) => {
					groupConfigs.push({
						getKeys: () => ["all"],
						createGroup: (key, children) => ({
							type: "chunks",
							children,
							// @ts-expect-error a function is not a stats JSON value
							format: () => key
						})
					});
				});
		};
		expect(typeof tap).toBe("function");
	});

	it("refuses a group listing what is not the path's created item", () => {
		/** @param {StatsFactory} factory the stats factory */
		const tap = (factory) => {
			factory.hooks.groupResults
				.for("compilation.chunks")
				.tap(PLUGIN, (groupConfigs) => {
					groupConfigs.push({
						getKeys: () => ["all"],
						// @ts-expect-error a group of chunks lists chunks
						createGroup: () => ({ type: "chunks", children: [1, 2] })
					});
				});
		};
		expect(typeof tap).toBe("function");
	});
});
