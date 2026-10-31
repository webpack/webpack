"use strict";

require("../helpers/warmup-webpack");

const path = require("path");

const testDirectory = path.resolve(__dirname, "..");

/** @typedef {import("../../lib/cache/PackFileCacheStrategy")} PackFileCacheStrategy */
/** @typedef {import("../../lib/serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */

/**
 * @param {string} name class name registered by makeSerializable
 * @returns {import("../../lib/serialization/ObjectMiddleware").ObjectSerializer} its serializer
 */
const getSerializer = (name) => {
	require("../../lib/cache/PackFileCacheStrategy");
	const ObjectMiddleware = require("../../lib/serialization/ObjectMiddleware");

	return ObjectMiddleware.getDeserializerFor(
		"webpack/lib/cache/PackFileCacheStrategy",
		name
	);
};

/**
 * @param {unknown[]} values values `read` returns, in order
 * @param {Record<string, unknown>=} extra additional context properties
 * @returns {ObjectDeserializerContext} a context reading the values
 */
const createContext = (values, extra) => {
	let index = 0;
	return /** @type {ObjectDeserializerContext} */ (
		/** @type {unknown} */ ({
			read: () => values[index++],
			...extra
		})
	);
};

/**
 * @param {string[]} messages collects every logged message
 * @returns {import("../../lib/logging/Logger").Logger} a logger
 */
const createLogger = (messages) => {
	const { Logger } = require("../../lib/logging/Logger");

	/** @type {import("../../lib/logging/Logger").Logger} */
	const logger = new Logger(
		(type, args) => {
			if (args) messages.push(`${type}: ${args[0]}`);
		},
		() => logger
	);
	return logger;
};

describe("PackFileCacheStrategy", () => {
	describe("Pack deserialize", () => {
		it("restores item infos and lazy content slots", async () => {
			const contentItems = getSerializer("PackContentItems").deserialize(
				createContext([true, new Map([["a", "value-a"]])])
			);
			const lazy = () => Promise.resolve(contentItems);
			const pack = /** @type {EXPECTED_ANY} */ (
				getSerializer("Pack").deserialize(
					createContext(
						// identifiers, etags, last accesses, then content slots
						[
							"a",
							"b",
							null,
							"etag-a",
							null,
							1,
							2,
							new Set(["a"]),
							lazy,
							undefined,
							null
						],
						{ logger: createLogger([]) }
					)
				)
			);
			expect([...pack.itemInfo.keys()]).toEqual(["a", "b"]);
			expect(pack.itemInfo.get("a").location).toBe(0);
			expect(pack.itemInfo.get("b").location).toBe(-1);
			expect(pack.content).toHaveLength(2);
			expect(pack.content[1]).toBeUndefined();
			await expect(pack.get("a", "etag-a")).resolves.toBe("value-a");
		});
	});

	describe("PackContentItems deserialize", () => {
		it("reads the map at once", () => {
			const map = new Map([["a", 1]]);
			const items = /** @type {EXPECTED_ANY} */ (
				getSerializer("PackContentItems").deserialize(
					createContext([true, map])
				)
			);
			expect(items.map).toBe(map);
		});

		it("reads item by item", () => {
			const items = /** @type {EXPECTED_ANY} */ (
				getSerializer("PackContentItems").deserialize(
					createContext([false, "a", 1, "b", 2, null])
				)
			);
			expect([...items.map]).toEqual([
				["a", 1],
				["b", 2]
			]);
		});

		it("reads item by item while profiling", () => {
			const items = /** @type {EXPECTED_ANY} */ (
				getSerializer("PackContentItems").deserialize(
					createContext([false, "a", 1, "b", 2, null], {
						logger: createLogger([]),
						profile: true
					})
				)
			);
			expect([...items.map]).toEqual([
				["a", 1],
				["b", 2]
			]);
		});
	});

	describe("restoring the pack", () => {
		const tempPath = path.resolve(testDirectory, "js", "pack-restore");

		/**
		 * @typedef {object} SnapshotResults
		 * @property {[Error | null, boolean?]} build result of checking the build snapshot
		 * @property {[Error | null, boolean?]} resolve result of checking the resolve snapshot
		 * @property {[Error | null, boolean?]=} resolveResults result of re-resolving
		 */

		/**
		 * @param {SnapshotResults} results what the file system info answers
		 * @param {string[]} messages collects every logged message
		 * @returns {{ strategy: PackFileCacheStrategy, pack: object }} a strategy whose index restores `pack`
		 */
		const createStrategy = (results, messages) => {
			const PackFileCacheStrategy = require("../../lib/cache/PackFileCacheStrategy");

			const strategy = new PackFileCacheStrategy({
				compiler: /** @type {import("../../lib/Compiler")} */ (
					/** @type {unknown} */ ({
						options: { output: { hashFunction: "md4" } }
					})
				),
				fs: require("graceful-fs"),
				context: tempPath,
				cacheLocation: tempPath,
				version: "test",
				logger: createLogger(messages),
				snapshot: { managedPaths: [], immutablePaths: [] },
				maxAge: 1000 * 60
			});
			const pack = {};
			const container = getSerializer("PackContainer").deserialize(
				createContext([
					"test",
					"build-snapshot",
					new Set(["build-dependency"]),
					new Map([["build-dependency", "resolved"]]),
					"resolve-snapshot",
					() => pack
				])
			);
			strategy.fileSerializer = /** @type {EXPECTED_ANY} */ ({
				deserialize: () => Promise.resolve(container)
			});
			strategy.fileSystemInfo = /** @type {EXPECTED_ANY} */ ({
				checkSnapshotValid: (
					/** @type {string} */ snapshot,
					/** @type {(err: Error | null, valid?: boolean) => void} */ callback
				) =>
					callback(
						...(snapshot === "build-snapshot"
							? results.build
							: results.resolve)
					),
				checkResolveResultsValid: (
					/** @type {unknown} */ _resolveResults,
					/** @type {(err: Error | null, valid?: boolean) => void} */ callback
				) =>
					callback(
						.../** @type {[Error | null, boolean?]} */ (results.resolveResults)
					)
			});
			return { strategy, pack };
		};

		it("uses the pack when both snapshots are valid", async () => {
			/** @type {string[]} */
			const messages = [];
			const { strategy, pack } = createStrategy(
				{ build: [null, true], resolve: [null, true] },
				messages
			);
			await expect(strategy._openPack()).resolves.toBe(pack);
			expect(strategy.buildSnapshot).toBe("build-snapshot");
			expect(strategy.resolveBuildDependenciesSnapshot).toBe(
				"resolve-snapshot"
			);
			expect([...strategy.buildDependencies]).toEqual(["build-dependency"]);
		});

		it("uses the pack when re-resolving finds the same results", async () => {
			/** @type {string[]} */
			const messages = [];
			const { strategy, pack } = createStrategy(
				{
					build: [null, true],
					resolve: [null, false],
					resolveResults: [null, true]
				},
				messages
			);
			await expect(strategy._openPack()).resolves.toBe(pack);
			expect([...strategy.newBuildDependencies]).toEqual([
				"build-dependency"
			]);
			expect(messages).toContain(
				"log: resolving of build dependencies is invalid, will re-resolve build dependencies"
			);
		});

		it("starts a new pack when checking the snapshots errors", async () => {
			/** @type {string[]} */
			const messages = [];
			const { strategy, pack } = createStrategy(
				{ build: [new Error("build")], resolve: [new Error("resolve")] },
				messages
			);
			const result = await strategy._openPack();
			expect(result).not.toBe(pack);
			expect(messages).toEqual(
				expect.arrayContaining([
					expect.stringMatching(
						/checking snapshot of build dependencies errored: Error: build/
					),
					expect.stringMatching(
						/checking snapshot of resolving of build dependencies errored: Error: resolve/
					)
				])
			);
		});

		it("starts a new pack when build dependencies changed and re-resolving errors", async () => {
			/** @type {string[]} */
			const messages = [];
			const { strategy, pack } = createStrategy(
				{
					build: [null, false],
					resolve: [null, false],
					resolveResults: [new Error("re-resolve")]
				},
				messages
			);
			const result = await strategy._openPack();
			expect(result).not.toBe(pack);
			expect(messages).toEqual(
				expect.arrayContaining([
					expect.stringMatching(/build dependencies have changed/),
					expect.stringMatching(
						/resolving of build dependencies errored: Error: re-resolve/
					)
				])
			);
		});

		it("starts a new pack when build dependencies resolve elsewhere", async () => {
			/** @type {string[]} */
			const messages = [];
			const { strategy, pack } = createStrategy(
				{
					build: [null, true],
					resolve: [null, false],
					resolveResults: [null, false]
				},
				messages
			);
			const result = await strategy._openPack();
			expect(result).not.toBe(pack);
			expect(messages).toEqual(
				expect.arrayContaining([
					expect.stringMatching(
						/build dependencies resolve to different locations/
					)
				])
			);
		});
	});
});
