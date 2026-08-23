"use strict";

require("./helpers/warmup-webpack");

const fs = require("fs");
const path = require("path");
const util = require("util");
const vm = require("vm");
const rimraf = require("rimraf");
const expectNoDeprecations = require("./helpers/expectNoDeprecations");
const supportsObjectHasOwn = require("./helpers/supportsObjectHasOwn");
const supportsOptionalChaining = require("./helpers/supportsOptionalChaining");

const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const utimes = util.promisify(fs.utimes);
const mkdir = util.promisify(fs.mkdir);

describe("Persistent Caching", () => {
	expectNoDeprecations();

	const tempPath = path.resolve(__dirname, "js", "persistent-caching");
	const outputPath = path.resolve(tempPath, "output");
	const cachePath = path.resolve(tempPath, "cache");
	const srcPath = path.resolve(tempPath, "src");

	const config = {
		mode: "none",
		context: tempPath,
		cache: {
			type: "filesystem",
			buildDependencies: {
				// avoid rechecking build dependencies
				// for performance
				// this is already covered by another test case
				defaultWebpack: []
			},
			cacheLocation: cachePath
		},
		experiments: {
			css: true
		},
		resolve: {
			alias: {
				"image.png": false,
				"image1.png": false
			}
		},
		target: "node",
		output: {
			library: { type: "commonjs-module", export: "default" },
			path: outputPath,
			// bundles are executed in this Node.js process; avoid `?.` on Node < 14
			// and `Object.hasOwn` on Node < 16.9
			environment: {
				optionalChaining: supportsOptionalChaining(),
				hasOwn: supportsObjectHasOwn()
			}
		}
	};

	beforeEach((done) => {
		rimraf(tempPath, done);
	});

	const updateSrc = async (/** @type {Record<string, string>} */ data) => {
		const ts = new Date(Date.now() - 10000);
		await mkdir(srcPath, { recursive: true });
		for (const key of Object.keys(data)) {
			const p = path.resolve(srcPath, key);
			await writeFile(p, data[key]);
			await utimes(p, ts, ts);
		}
	};

	const compile = async (/** @type {any} */ configAdditions = {}) =>
		new Promise((resolve, reject) => {
			const webpack = require("../");

			webpack(
				/** @type {import("../").Configuration} */ (
					/** @type {unknown} */ ({
						...config,
						...configAdditions,
						cache: {
							...config.cache,
							.../** @type {any} */ (configAdditions).cache
						}
					})
				),
				(
					/** @type {Error | null} */ err,
					/** @type {import("../").Stats | undefined} */ _stats
				) => {
					if (err) return reject(err);
					const stats = /** @type {import("../").Stats} */ (_stats);
					if (stats.hasErrors()) {
						return reject(stats.toString({ preset: "errors-only" }));
					}
					resolve(stats);
				}
			);
		});

	const getCacheFileTimes = async () => {
		const cacheFiles = (await readdir(cachePath)).sort();
		return new Map(
			cacheFiles.map((f) => [
				f,
				fs.statSync(path.join(cachePath, f)).mtime.toString()
			])
		);
	};

	const execute = () => {
		/** @type {Record<string, { exports: unknown }>} */
		const cache = {};
		const require = (/** @type {string} */ name) => {
			if (cache[name]) return cache[name].exports;
			if (!name.endsWith(".js")) name += ".js";
			const p = path.resolve(outputPath, name);
			const source = fs.readFileSync(p, "utf8");
			const context = {};
			const fn =
				/** @type {(require: (name: string) => any, module: { exports: unknown }, exports: unknown) => void} */ (
					/** @type {any} */ (vm.runInThisContext)(
						`(function(require, module, exports) { ${source} })`,
						context,
						{
							filename: p
						}
					)
				);
			const m = { exports: /** @type {unknown} */ ({}) };
			cache[name] = m;
			fn(require, m, m.exports);
			return m.exports;
		};
		return require("./main");
	};

	it("should compile fine (warmup)", async () => {
		const data = {
			"index.js": `import file from "./file.js";
export default 40 + file;
`,
			"file.js": "export default 2;"
		};
		await updateSrc(data);
		await compile();
		expect(execute()).toBe(42);
	}, 100000);

	it("should support zstd compression, or fail fast when unsupported", async () => {
		const data = {
			"index.js": `import file from "./file.js";
export default 40 + file;
`,
			"file.js": "export default 2;"
		};
		await updateSrc(data);
		// zstd streams require Node.js >= 22.15
		if ("createZstdCompress" in require("zlib")) {
			// cold build writes a zstd-compressed cache
			await compile({ cache: { compression: "zstd" } });
			expect(execute()).toBe(42);
			expect((await readdir(cachePath)).some((f) => f.endsWith(".zst"))).toBe(
				true
			);
			// warm build reads it back, exercising zstd decompression
			await compile({ cache: { compression: "zstd" } });
			expect(execute()).toBe(42);
		} else {
			await expect(compile({ cache: { compression: "zstd" } })).rejects.toThrow(
				"cache.compression: 'zstd' requires Node.js >= 22.15.0"
			);
		}
	}, 100000);

	it("should merge multiple small files", async () => {
		const files = Array.from({ length: 30 }).map((_, i) => `file${i}.js`);
		const data = {
			"index.js": `
import * as style from "./style.modules.css";

${files.map((f, i) => `import f${i} from "./${f}";`).join("\n")}

export default ${files.map((_, i) => `f${i}`).join(" + ")};
export { style };
`,
			"style.modules.css": `.class {
	color: red;
	background: url('image.png');
}`
		};
		for (const file of files) {
			/** @type {Record<string, string>} */ (data)[file] = "export default 1;";
		}
		await updateSrc(data);
		await compile({ cache: { compression: false } });
		expect(execute()).toBe(30);
		for (let i = 0; i < 30; i++) {
			updateSrc({
				[files[i]]: "export default 2;",
				"style.modules.css": `.class-${i} { color: red; background: url('image1.png'); }`
			});
			await compile({ cache: { compression: false } });
			expect(execute()).toBe(31 + i);
		}
		const cacheFiles = await readdir(cachePath);
		expect(cacheFiles.length).toBeLessThan(20);
		expect(cacheFiles.length).toBeGreaterThan(10);
	}, 120000);

	it("should optimize unused content", async () => {
		const data = {
			"a.js": 'import "react-dom";',
			"b.js": 'import "acorn";',
			"c.js": 'import "core-js";',
			"d.js": 'import "date-fns";',
			"e.js": 'import "lodash";'
		};
		await updateSrc(data);
		const c = (/** @type {string} */ items) => {
			/** @type {Record<string, string>} */
			const entry = {};
			for (const item of items) entry[item] = `./src/${item}.js`;
			return compile({ entry, cache: { compression: false } });
		};
		await c("abcde");
		await c("abc");
		await c("cde");
		await c("acd");
		await c("bce");
		await c("abcde");
		const cacheFiles = await readdir(cachePath);
		expect(cacheFiles.length).toBeGreaterThan(4);
	}, 120000);

	it("should allow persistent caching of container related objects", async () => {
		const data = {
			"index.js":
				"export default import('container/src/exposed').then(m => m.default);",
			"exposed.js": "import lib from 'lib'; export default 21 + lib;",
			"lib.js": "export default 20",
			"lib2.js": "export default 21"
		};
		await updateSrc(data);

		const webpack = require("../");

		const configAdditions = {
			plugins: [
				new webpack.container.ModuleFederationPlugin({
					name: "container",
					library: { type: "commonjs-module" },
					exposes: ["./src/exposed"],
					remotes: {
						container: ["./no-container", "./container"]
					},
					shared: {
						lib: {
							import: "./src/lib",
							shareKey: "lib",
							version: "1.2.0",
							requiredVersion: "^1.0.0"
						},
						"./src/lib2": {
							shareKey: "lib",
							version: "1.2.3"
						}
					}
				})
			]
		};
		await compile(configAdditions);
		await expect(execute()).resolves.toBe(42);
		await updateSrc({
			"exposed.js": "module.exports = { ok: true };"
		});
		await compile(configAdditions);
		await expect(execute()).resolves.toEqual({ ok: true });
	}, 120000);

	it("should not overwrite cache files if readonly = true", async () => {
		await updateSrc({
			"main.js": `
import { sum } from 'lodash';

sum([1,2,3])
			`
		});
		await compile({ entry: "./src/main.js" });
		const firstCacheFileTimes = await getCacheFileTimes();

		await updateSrc({
			"main.js": `
import 'lodash';
			`
		});
		await compile({
			entry: "./src/main.js",
			cache: {
				...config.cache,
				readonly: true
			}
		});
		await expect(getCacheFileTimes()).resolves.toEqual(firstCacheFileTimes);
	}, 20000);

	// Backdates the recorded first seen times so the next store deletes the orphans,
	// and ages their files past the recent write window like a restore would.
	const ageUnreferenced = async () => {
		const file = path.join(cachePath, "unreferenced.json");
		if (!fs.existsSync(file)) return;
		const data = JSON.parse(await readFile(file, "utf8"));
		const firstSeen = Date.now() - 2 * 60 * 60 * 1000;
		const restored = new Date(Date.now() - 5 * 60 * 1000);
		for (const [name, entry] of Object.entries(data)) {
			entry.firstSeen = firstSeen;
			await utimes(path.join(cachePath, name), restored, restored);
		}
		await writeFile(file, JSON.stringify(data));
	};

	it("should delete no longer referenced cache files after storing", async () => {
		await updateSrc({
			"index.js": `import file from "./file.js";
export default 40 + file;
`,
			"file.js": "export default 2;"
		});
		await compile();
		const orphan = "0123456789abcdef0123456789abcdef.pack";
		await writeFile(path.join(cachePath, orphan), "orphan");
		await updateSrc({
			"file.js": "export default 3;"
		});
		await compile();
		// the orphan is only recorded as unreferenced by this store
		expect(await readdir(cachePath)).toContain(orphan);
		await ageUnreferenced();
		await updateSrc({
			"file.js": "export default 4;"
		});
		await compile();
		expect(await readdir(cachePath)).not.toContain(orphan);
		// every file the new index references must have survived the cleanup
		await compile();
		expect(execute()).toBe(44);
	}, 60000);

	it("should reclaim every expired pack in a single store", async () => {
		/** @type {Record<string, string>} */
		const data = {};
		for (let i = 0; i < 6; i++) {
			// bulky modules so each round persists its own content pack
			data[`m${i}.js`] = `export default ${i};\n// ${"y".repeat(120000)}`;
		}
		await updateSrc(data);
		const c = (/** @type {string[]} */ items) => {
			/** @type {Record<string, string>} */
			const entry = {};
			for (const item of items) entry[item] = `./src/${item}.js`;
			return compile({ entry, cache: { ...config.cache, maxAge: 500 } });
		};
		// build up several packs, one per round
		for (let i = 0; i < 6; i++) await c([`m${i}`]);
		const packsBefore = (await readdir(cachePath)).filter((f) =>
			/^\d+\.pack$/.test(f)
		);
		expect(packsBefore.length).toBeGreaterThan(2);
		// let every cached item pass maxAge, then store once
		await new Promise((resolve) => {
			setTimeout(resolve, 1000);
		});
		await updateSrc({ "fresh.js": "export default 1;" });
		await c(["fresh"]);
		await ageUnreferenced();
		// a changed source so this build actually stores and runs the cleanup
		await updateSrc({ "fresh.js": "export default 2;" });
		await c(["fresh"]);
		// a single collection drops all of them, not one pack per build
		const packsAfter = (await readdir(cachePath)).filter((f) =>
			/^\d+\.pack$/.test(f)
		);
		expect(packsAfter.length).toBeLessThan(packsBefore.length - 1);
	}, 60000);

	it("should delete old unused packs", async () => {
		// ported from #14661: entry churn with a tiny maxAge orphans whole packs
		const data = {
			"a.js": "export default 1;",
			"b.js": "export default 2;",
			"c.js": "export default 3;",
			"d.js": "export default 4;",
			"e.js": "export default 5;"
		};
		await updateSrc(data);
		const backdateCache = async () => {
			const oldTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
			for (const file of await readdir(cachePath)) {
				await utimes(path.join(cachePath, file), oldTime, oldTime);
			}
		};
		const c = (/** @type {string} */ items) => {
			/** @type {Record<string, string>} */
			const entry = {};
			for (const item of items) entry[item] = `./src/${item}.js`;
			return compile({ entry, cache: { ...config.cache, maxAge: 5000 } });
		};
		await c("ab");
		// content pack and index
		await expect(readdir(cachePath)).resolves.toHaveLength(2);
		await c("c");
		// new content pack, index and index.old; nothing is unreferenced yet
		await expect(readdir(cachePath)).resolves.toHaveLength(4);
		// item expiry needs real elapsed time; the index backup ages via utimes
		await backdateCache();
		await new Promise((resolve) => {
			setTimeout(resolve, 6000);
		});
		await c("cde");
		// the stale index backup is gone once it is older than the grace period
		expect(await readdir(cachePath)).not.toContain("index.pack.old");
		// further churn reuses or deletes unreferenced packs instead of piling them up
		for (let i = 0; i < 3; i++) {
			await ageUnreferenced();
			await c("de");
		}
		const remaining = await readdir(cachePath);
		expect(remaining.filter((f) => /^\d+\.pack$/.test(f))).toHaveLength(3);
		expect(remaining).toContain("index.pack");
	}, 60000);

	it("should keep recently modified unreferenced cache files", async () => {
		await updateSrc({
			"index.js": "export default 42;"
		});
		await compile();
		// fresh orphan: within the cleanup grace period, so it must survive
		const orphan = "0123456789abcdef0123456789abcdef.pack";
		await writeFile(path.join(cachePath, orphan), "orphan");
		await updateSrc({
			"index.js": "export default 43;"
		});
		await compile();
		expect(await readdir(cachePath)).toContain(orphan);
	}, 60000);

	it("should not invalidate cache files if timestamps changed with dynamic import()", async () => {
		const configAdditions = {
			entry: "./src/main.js",
			snapshot: {
				resolve: { hash: true },
				module: { hash: true },
				contextModule: { hash: true }
			}
		};
		await updateSrc({
			"newer.js": "export default 2;",
			// eslint-disable-next-line no-template-curly-in-string
			"main.js": 'const f = "newer.js"; import(`./${f}`);'
		});
		await compile(configAdditions);
		const firstCacheFileTimes = await getCacheFileTimes();

		await utimes(path.resolve(srcPath, "newer.js"), new Date(), new Date());

		await compile(configAdditions);
		await expect(getCacheFileTimes()).resolves.toEqual(firstCacheFileTimes);
	}, 20000);
});
