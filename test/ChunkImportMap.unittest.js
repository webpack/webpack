"use strict";

const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");
const webpack = require("..");
const ChunkImportMapPlugin = require("../lib/esm/ChunkImportMapPlugin");

/**
 * @param {object} extra extra webpack options merged in
 * @returns {import("../").Configuration} the config
 */
const config = (extra) => ({
	mode: "production",
	target: "web",
	context: path.resolve(__dirname, "fixtures"),
	entry: "./chunkImportMapEntry.js",
	experiments: { outputModule: true },
	output: {
		module: true,
		publicPath: "/",
		path: "/out",
		filename: "[name].[contenthash].mjs",
		chunkFilename: "[name].[contenthash].mjs"
	},
	// A single runtime chunk gives the entry a static inter-chunk import to
	// indirect.
	optimization: { runtimeChunk: "single" },
	...extra
});

/**
 * @param {import("../").Configuration} options webpack options
 * @param {(assets: import("../").Asset[]) => void} check assertion callback
 * @param {() => void} done mocha/jest done
 */
const build = (options, check, done) => {
	const compiler = webpack(options);
	compiler.outputFileSystem = createFsFromVolume(new Volume());
	compiler.run((err, stats) => {
		try {
			expect(err).toBeFalsy();
			expect(
				/** @type {import("../").Stats} */ (stats).hasErrors()
			).toBe(false);
			check(/** @type {import("../").Stats} */ (stats).compilation.getAssets());
		} finally {
			compiler.close(() => done());
		}
	});
};

describe("ChunkImportMapPlugin", () => {
	it("indirects ESM inter-chunk imports through a stable specifier and emits an import map", (done) => {
		build(
			config({ plugins: [new ChunkImportMapPlugin()] }),
			(assets) => {
				const importMap = assets.find((a) => a.name === "importmap.json");
				expect(importMap).toBeDefined();
				const map = JSON.parse(
					/** @type {import("../").Asset} */ (importMap).source.source().toString()
				);
				const keys = Object.keys(map.imports);
				expect(keys.length).toBeGreaterThan(0);
				// Keys are stable, content-independent specifiers.
				expect(keys.every((k) => k.startsWith("webpack/c/"))).toBe(true);
				// Values are the hashed chunk URLs.
				expect(
					Object.values(map.imports).every(
						(v) => typeof v === "string" && v.endsWith(".mjs")
					)
				).toBe(true);
				// The entry chunk imports via the stable specifier, not a hashed path.
				const entry = assets.find(
					(a) => a.name.startsWith("main") && a.name.endsWith(".mjs")
				);
				expect(entry).toBeDefined();
				const src = /** @type {import("../").Asset} */ (entry).source
					.source()
					.toString();
				expect(src).toContain('from "webpack/c/');
				// The hashed relative import has been replaced by the specifier.
				expect(src).not.toMatch(/from "\.\/[^"]+\.mjs"/);
			},
			done
		);
	});

	it("leaves output unchanged when the plugin is absent", (done) => {
		build(
			config({}),
			(assets) => {
				expect(assets.find((a) => a.name === "importmap.json")).toBeUndefined();
				const entry = assets.find(
					(a) => a.name.startsWith("main") && a.name.endsWith(".mjs")
				);
				expect(entry).toBeDefined();
				const src = /** @type {import("../").Asset} */ (entry).source
					.source()
					.toString();
				// Without the map, the runtime import uses a hashed relative path.
				expect(src).not.toContain('from "webpack/c/');
				expect(src).toMatch(/from "\.\/[^"]+\.mjs"/);
			},
			done
		);
	});
});
