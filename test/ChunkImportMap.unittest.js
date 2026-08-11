"use strict";

const fs = require("fs");
const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");
const webpack = require("..");
const ChunkImportMapPlugin = require("../lib/esm/ChunkImportMapPlugin");

const context = path.resolve(__dirname, "js", "chunk-import-map");

/**
 * @param {object} extra extra webpack options merged in
 * @returns {import("../").Configuration} the config
 */
const config = (extra) => ({
	mode: "production",
	target: "web",
	context,
	entry: "./entry.js",
	experiments: { outputModule: true },
	output: {
		module: true,
		publicPath: "/",
		path: "/out",
		filename: "[name].[contenthash].mjs",
		chunkFilename: "[name].[contenthash].mjs"
	},
	optimization: {
		// Otherwise the vendor module is inlined and never becomes its own chunk.
		concatenateModules: false,
		// Both give the entry chunk a static inter-chunk import to indirect.
		runtimeChunk: "single",
		splitChunks: {
			cacheGroups: {
				vendor: {
					test: /vendor\.js$/,
					name: "vendor",
					chunks: "all",
					enforce: true
				}
			}
		}
	},
	...extra
});

/**
 * @param {import("../").Configuration} options webpack options
 * @returns {Promise<Record<string, string>>} the emitted files by name
 */
const build = (options) =>
	new Promise((resolve, reject) => {
		const compiler = webpack(options);
		const volume = new Volume();
		compiler.outputFileSystem = createFsFromVolume(volume);
		compiler.run((err, stats) => {
			compiler.close(() => {
				if (err) return reject(err);
				const { errors } = /** @type {import("../").Stats} */ (stats).toJson({
					errors: true
				});
				if (errors && errors.length > 0) {
					return reject(new Error(JSON.stringify(errors, null, 2)));
				}
				/** @type {Record<string, string>} */
				const files = {};
				for (const [name, content] of Object.entries(volume.toJSON())) {
					files[name.replace(/^\/out\//, "")] = /** @type {string} */ (content);
				}
				resolve(files);
			});
		});
	});

/**
 * @param {Record<string, string>} files emitted files
 * @param {string} prefix chunk name prefix
 * @returns {string} the matching file name
 */
const chunkName = (files, prefix) => {
	const name = Object.keys(files).find(
		(n) => n.startsWith(`${prefix}.`) && n.endsWith(".mjs")
	);
	expect(name).toBeDefined();
	return /** @type {string} */ (name);
};

describe("ChunkImportMapPlugin", () => {
	beforeEach(() => {
		fs.rmSync(context, { recursive: true, force: true });
		fs.mkdirSync(context, { recursive: true });
		fs.writeFileSync(
			path.join(context, "entry.js"),
			'import { v } from "./vendor.js";\nglobalThis.out = v();\n'
		);
		fs.writeFileSync(
			path.join(context, "vendor.js"),
			'export const v = () => "1";\n'
		);
	});

	afterAll(() => {
		fs.rmSync(context, { recursive: true, force: true });
	});

	it("routes ESM inter-chunk imports through a stable specifier and emits an import map", async () => {
		const files = await build(
			config({ plugins: [new ChunkImportMapPlugin()] })
		);
		expect(files["importmap.json"]).toBeDefined();
		const { imports } = JSON.parse(files["importmap.json"]);
		const entries = Object.entries(imports);
		expect(entries.length).toBeGreaterThan(1);
		for (const [specifier, url] of entries) {
			// Keys are stable, content-independent specifiers.
			expect(specifier).toMatch(/^webpack\/c\//);
			// Values are the hashed chunk URLs, and each one was actually emitted.
			expect(url).toMatch(/^\/.+\.mjs$/);
			expect(files[/** @type {string} */ (url).slice(1)]).toBeDefined();
		}
		const src = files[chunkName(files, "main")];
		expect(src).toMatch(/from\s*"webpack\/c\//);
		// Every hashed relative import has been replaced by a specifier.
		expect(src).not.toMatch(/from\s*"\.\/[^"]+\.mjs"/);
	}, 60000);

	it("honors a custom file name", async () => {
		const files = await build(
			config({
				plugins: [new ChunkImportMapPlugin({ fileName: "assets/map.json" })]
			})
		);
		expect(files["importmap.json"]).toBeUndefined();
		expect(files["assets/map.json"]).toBeDefined();
	}, 60000);

	it("leaves output unchanged when the plugin is absent", async () => {
		const files = await build(config({}));
		expect(files["importmap.json"]).toBeUndefined();
		const src = files[chunkName(files, "main")];
		// Without the map, inter-chunk imports use hashed relative paths.
		expect(src).not.toMatch(/from\s*"webpack\/c\//);
		expect(src).toMatch(/from\s*"\.\/[^"]+\.mjs"/);
	}, 60000);

	it("keeps the importer's hash stable when an imported chunk changes", async () => {
		/**
		 * @param {import("../").Configuration} options webpack options
		 * @returns {Promise<[string, string]>} main chunk name before and after
		 */
		const mainNamesAcrossEdit = async (options) => {
			const files = await build(options);
			const before = chunkName(files, "main");
			const vendorBefore = chunkName(files, "vendor");
			fs.writeFileSync(
				path.join(context, "vendor.js"),
				'export const v = () => "2222";\n'
			);
			const changed = await build(options);
			// Guard the premise: the edited chunk really did re-hash.
			expect(chunkName(changed, "vendor")).not.toBe(vendorBefore);
			fs.writeFileSync(
				path.join(context, "vendor.js"),
				'export const v = () => "1";\n'
			);
			return [before, chunkName(changed, "main")];
		};

		const [withoutBefore, withoutAfter] = await mainNamesAcrossEdit(config({}));
		// Baseline: the hashed URL is inlined, so the importer re-hashes too.
		expect(withoutAfter).not.toBe(withoutBefore);

		const [withBefore, withAfter] = await mainNamesAcrossEdit(
			config({ plugins: [new ChunkImportMapPlugin()] })
		);
		expect(withAfter).toBe(withBefore);
	}, 120000);

	describe("injectIntoHtml", () => {
		const imports = { "webpack/c/1": "/a.mjs" };

		/**
		 * @param {string} html the document
		 * @returns {EXPECTED_ANY} the parsed import map
		 */
		const mapOf = (html) => {
			const match = /** @type {RegExpExecArray} */ (
				/<script type="importmap">([\s\S]*?)<\/script>/.exec(html)
			);
			return JSON.parse(match[1]);
		};

		it("inserts the import map before the first module script", () => {
			const out = ChunkImportMapPlugin.injectIntoHtml(
				'<!doctype html><html><head><link rel="stylesheet" href="a.css"><script type="module" src="/main.mjs"></script></head><body></body></html>',
				imports
			);
			expect(out.indexOf('type="importmap"')).toBeLessThan(
				out.indexOf('type="module"')
			);
			expect(mapOf(out).imports).toEqual(imports);
		});

		it("inserts the import map before a modulepreload link", () => {
			const out = ChunkImportMapPlugin.injectIntoHtml(
				'<!doctype html><head><link rel="modulepreload" href="/a.mjs"></head>',
				imports
			);
			expect(out.indexOf('type="importmap"')).toBeLessThan(
				out.indexOf('rel="modulepreload"')
			);
		});

		it("stays inside the document when there is nothing to precede", () => {
			const out = ChunkImportMapPlugin.injectIntoHtml(
				"<!doctype html><html><head><title>x</title></head><body></body></html>",
				imports
			);
			// Never before the doctype — that would trigger quirks mode.
			expect(out.startsWith("<!doctype html>")).toBe(true);
			expect(out.indexOf('type="importmap"')).toBeLessThan(
				out.indexOf("<body")
			);
		});

		it("prepends when there is no head and no module script", () => {
			const out = ChunkImportMapPlugin.injectIntoHtml("<p>hi</p>", imports);
			expect(out.startsWith('<script type="importmap">')).toBe(true);
		});

		it("merges an existing import map and moves it before the module script", () => {
			const out = ChunkImportMapPlugin.injectIntoHtml(
				'<head><script type="module" src="/main.mjs"></script><script type="importmap">{"imports":{"lit":"https://cdn/lit.js"},"scopes":{}}</script></head>',
				imports
			);
			const map = mapOf(out);
			expect(map.imports.lit).toBe("https://cdn/lit.js");
			expect(map.imports["webpack/c/1"]).toBe("/a.mjs");
			// Unrelated keys survive the merge.
			expect(map.scopes).toEqual({});
			// A document may only carry one import map, and it must come first.
			expect(out.match(/type="importmap"/g) || []).toHaveLength(1);
			expect(out.indexOf('type="importmap"')).toBeLessThan(
				out.indexOf('type="module"')
			);
		});

		it("replaces an unparsable import map instead of throwing", () => {
			const out = ChunkImportMapPlugin.injectIntoHtml(
				"<head><script type='importmap'>not json</script></head>",
				imports
			);
			expect(mapOf(out).imports).toEqual(imports);
			expect(out.match(/type=['"]importmap['"]/g) || []).toHaveLength(1);
		});
	});
});
