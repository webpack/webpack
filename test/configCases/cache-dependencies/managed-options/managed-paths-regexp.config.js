"use strict";

const path = require("path");

/** @typedef {import("../../../../").NormalModule} NormalModule */
/** @typedef {NonNullable<NormalModule["buildInfo"]>} BuildInfo */
/** @typedef {NonNullable<BuildInfo["snapshot"]>} Snapshot */
/** @typedef {import("../../../../").Configuration["snapshot"]} SnapshotOptions */

// A `managedPaths` RegExp is documented as matching the managed directory
// itself, so one without a capture group names it with the whole match.
const managedPath = new RegExp(
	`^${path
		.resolve(__dirname, "node_modules")
		.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")}[\\\\/]`
);

/**
 * @param {Snapshot} snapshot snapshot
 * @param {("managedItemInfo" | "fileTimestamps" | "fileHashes" | "fileTshs")[]} keys snapshot entries
 * @returns {string[]} paths of those entries in the snapshot and its children
 */
const collect = (snapshot, keys) => {
	/** @type {string[]} */
	const items = [];
	for (const key of keys) {
		const map = snapshot[key];
		if (map) items.push(...map.keys());
	}
	for (const child of snapshot.children || []) {
		items.push(...collect(child, keys));
	}
	return items;
};

/**
 * @param {SnapshotOptions} snapshot snapshot options
 * @param {{ managedItems: string[], files: string[] }} expected paths relative to the case
 * @returns {import("../../../../").Configuration} configuration
 */
const createConfig = (snapshot, expected) => ({
	snapshot,
	plugins: [
		(compiler) => {
			compiler.hooks.done.tap("Test", ({ compilation }) => {
				const fileDeps = [...compilation.fileDependencies];
				expect(fileDeps).toContain(
					path.resolve(__dirname, "node_modules/package/index.js")
				);
				expect(fileDeps).toContain(path.resolve(__dirname, "index.js"));
				const packageModule = /** @type {NormalModule} */ (
					[...compilation.modules].find(
						(module) =>
							/** @type {NormalModule} */ (module).resource ===
							path.resolve(__dirname, "node_modules/package/index.js")
					)
				);
				const moduleSnapshot = /** @type {Snapshot} */ (
					/** @type {BuildInfo} */ (packageModule.buildInfo).snapshot
				);
				expect(collect(moduleSnapshot, ["managedItemInfo"])).toEqual(
					expected.managedItems.map((item) => path.resolve(__dirname, item))
				);
				expect(
					collect(moduleSnapshot, [
						"fileTimestamps",
						"fileHashes",
						"fileTshs"
					]).filter((file) =>
						file.startsWith(path.resolve(__dirname, "node_modules"))
					)
				).toEqual(expected.files.map((item) => path.resolve(__dirname, item)));
			});
		}
	],
	module: {
		unsafeCache: false
	}
});

const managed = {
	managedItems: ["node_modules/package"],
	files: []
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	createConfig({ managedPaths: [managedPath] }, managed),
	createConfig({ managedPaths: ["./**/node_modules"] }, managed),
	createConfig({ managedPaths: ["../*/node_modules"] }, managed),
	createConfig({ managedPaths: ["node_modules"] }, managed),
	createConfig(
		{
			managedPaths: ["**/node_modules"],
			unmanagedPaths: ["**/node_modules/package"]
		},
		{
			managedItems: [],
			files: ["node_modules/package/index.js", "node_modules/package/extra.js"]
		}
	),
	createConfig(
		{ managedPaths: [], immutablePaths: ["**/node_modules"] },
		{ managedItems: [], files: [] }
	)
];
