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

	const compile = async (/** @type {EXPECTED_ANY} */ configAdditions = {}) =>
		new Promise((resolve, reject) => {
			const webpack = require("../");

			webpack(
				/** @type {import("../").Configuration} */ (
					/** @type {unknown} */ ({
						...config,
						...configAdditions,
						cache: {
							...config.cache,
							.../** @type {EXPECTED_ANY} */ (configAdditions).cache
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
				/** @type {(require: (name: string) => EXPECTED_ANY, module: { exports: unknown }, exports: unknown) => void} */ (
					/** @type {EXPECTED_ANY} */ (vm.runInThisContext)(
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
			// Awaited: the writes it ends with outlive the test otherwise, and the
			// next one's `rimraf` takes the file out from under them.
			await updateSrc({
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

	// An inlined export embeds its literal in the consumer's codegen; the
	// filesystem cache must invalidate that consumer when the value changes.
	it("should invalidate consumer codegen when an inlined export value changes", async () => {
		const configAdditions = {
			mode: "production",
			optimization: { minimize: false },
			output: {
				...config.output,
				pathinfo: true
			}
		};
		await updateSrc({
			"index.js": `import { FLAG, NUM } from "./env.js";
export default [NUM, FLAG];
`,
			"env.js": `export const NUM = 5;
export const FLAG = "on";
`
		});
		await compile(configAdditions);
		expect(execute()).toEqual([5, "on"]);
		const first = await readFile(path.resolve(outputPath, "main.js"), "utf8");
		expect(first).toContain("inlined export .NUM */5");
		expect(first).toContain('inlined export .FLAG */"on"');

		// Both values stay within the ≤6-byte inline limit so a yes→no
		// boundary change cannot mask the stale-hash bug (#22019).
		await updateSrc({
			"env.js": `export const NUM = 6;
export const FLAG = "off";
`
		});
		await compile(configAdditions);
		expect(execute()).toEqual([6, "off"]);
		const second = await readFile(path.resolve(outputPath, "main.js"), "utf8");
		expect(second).toContain("inlined export .NUM */6");
		expect(second).toContain('inlined export .FLAG */"off"');
	}, 100000);

	// A DefinePlugin value changes the inlined literal without touching the
	// module source, so its build hash alone cannot key the provided exports.
	it("should invalidate consumer codegen when a plugin-provided inlined export changes", async () => {
		const { DefinePlugin } = require("../");

		const configFor = (/** @type {string} */ flag) => ({
			mode: "production",
			optimization: { minimize: false },
			output: {
				...config.output,
				pathinfo: true
			},
			plugins: [new DefinePlugin({ "process.env.FLAG": JSON.stringify(flag) })]
		});
		await updateSrc({
			"index.js": `import { FLAG } from "./env.js";
export default FLAG;
`,
			"env.js": "export const FLAG = process.env.FLAG;\n"
		});
		await compile(configFor("on"));
		expect(execute()).toBe("on");
		const first = await readFile(path.resolve(outputPath, "main.js"), "utf8");
		expect(first).toContain('inlined export .FLAG */"on"');

		await compile(configFor("off"));
		expect(execute()).toBe("off");
		const second = await readFile(path.resolve(outputPath, "main.js"), "utf8");
		expect(second).toContain('inlined export .FLAG */"off"');
	}, 100000);

	// A value version is user-supplied text; spelling out the encoding's own
	// separators must not forge another key's entry in the cache key.
	it("should key value dependencies whose versions contain the separators", async () => {
		const { DefinePlugin } = require("../");

		const keyB = `${DefinePlugin.VALUE_DEP_PREFIX}process.env.B`;
		const configFor = (
			/** @type {string} */ suffix,
			/** @type {string} */ versionA,
			/** @type {string} */ versionB
		) => ({
			mode: "production",
			optimization: { minimize: false },
			plugins: [
				new DefinePlugin({
					"process.env.A": DefinePlugin.runtimeValue(
						() => JSON.stringify(`a${suffix}`),
						{ version: versionA }
					),
					"process.env.B": DefinePlugin.runtimeValue(
						() => JSON.stringify(`b${suffix}`),
						{ version: versionB }
					)
				})
			]
		});
		await updateSrc({
			"index.js": `import { A, B } from "./env.js";
export default [A, B];
`,
			"env.js": `export const A = process.env.A;
export const B = process.env.B;
`
		});
		await compile(configFor("1", `1|${keyB}=2`, "3"));
		expect(execute()).toEqual(["a1", "b1"]);

		// The two version sets concatenate to the same "key=value|…" text
		await compile(configFor("2", "1", `2|${keyB}=3`));
		expect(execute()).toEqual(["a2", "b2"]);
	}, 100000);

	const inlineConfig = {
		mode: "production",
		optimization: { minimize: false },
		output: {
			...config.output,
			pathinfo: true
		}
	};

	// Each kind renders its own literal, so a cache that refreshes one may
	// still hand a consumer the previous kind's text.
	it("should refresh every kind of inlined literal across cached builds", async () => {
		const steps = [
			{ code: "1", value: 1, literal: "1" },
			{ code: '"ab"', value: "ab", literal: '"ab"' },
			{ code: "true", value: true, literal: "true" },
			{ code: "null", value: null, literal: "null" },
			{ code: "undefined", value: undefined, literal: "undefined" },
			{ code: "2", value: 2, literal: "2" }
		];
		await updateSrc({
			"index.js": `import { VALUE } from "./env.js";
export default VALUE;
`
		});
		for (const step of steps) {
			await updateSrc({ "env.js": `export const VALUE = ${step.code};\n` });
			await compile(inlineConfig);
			expect(execute()).toBe(step.value);
			const source = await readFile(
				path.resolve(outputPath, "main.js"),
				"utf8"
			);
			expect(source).toContain(`inlined export .VALUE */${step.literal}`);
		}
	}, 120000);

	// Inlining stops above 6 bytes, so a cached consumer has to gain the
	// literal, lose it, and gain it again.
	it("should add and drop an inlined literal across the size limit", async () => {
		await updateSrc({
			"index.js": `import { SHORT, NUM } from "./env.js";
export default [SHORT, NUM];
`
		});
		const steps = [
			{ short: "abc", num: 1, inlined: true },
			{ short: "abcdefgh", num: 1234567, inlined: false },
			{ short: "xyz", num: 9, inlined: true }
		];
		for (const step of steps) {
			await updateSrc({
				"env.js": `export const SHORT = ${JSON.stringify(step.short)};
export const NUM = ${step.num};
`
			});
			await compile(inlineConfig);
			expect(execute()).toEqual([step.short, step.num]);
			const source = await readFile(
				path.resolve(outputPath, "main.js"),
				"utf8"
			);
			if (step.inlined) {
				expect(source).toContain(
					`inlined export .SHORT */${JSON.stringify(step.short)}`
				);
				expect(source).toContain(`inlined export .NUM */${step.num}`);
			} else {
				expect(source).not.toContain("inlined export .SHORT");
				expect(source).not.toContain("inlined export .NUM");
			}
		}
	}, 120000);

	// The literal travels the whole chain, so any link may serve a stale one.
	it("should refresh an inlined literal reached through re-exports", async () => {
		await updateSrc({
			"index.js": `import { LEAF } from "./barrel.js";
import { NAMED } from "./renamed.js";
export default [LEAF, NAMED];
`,
			"barrel.js": 'export { LEAF } from "./mid.js";\n',
			"renamed.js": 'export { LEAF as NAMED } from "./mid.js";\n',
			"mid.js": 'export { LEAF } from "./leaf.js";\n'
		});
		for (const value of [1, 2, 3]) {
			await updateSrc({ "leaf.js": `export const LEAF = ${value};\n` });
			await compile(inlineConfig);
			expect(execute()).toEqual([value, value]);
			const source = await readFile(
				path.resolve(outputPath, "main.js"),
				"utf8"
			);
			// A renamed re-export still renders under the name the leaf exports
			expect(source).toContain(`inlined export .LEAF */${value}`);
			expect(source).not.toContain(`inlined export .LEAF */${value - 1}`);
		}
	}, 120000);

	// Without concatenation the literal comes from RuntimeTemplate instead of
	// ConcatenatedModule, which is a separate renderer with its own cache path.
	it("should refresh an inlined literal without module concatenation", async () => {
		const configAdditions = {
			...inlineConfig,
			optimization: { minimize: false, concatenateModules: false }
		};
		await updateSrc({
			"index.js": `import { VALUE } from "./env.js";
export default VALUE;
`
		});
		for (const value of [10, 11, 12]) {
			await updateSrc({ "env.js": `export const VALUE = ${value};\n` });
			await compile(configAdditions);
			expect(execute()).toBe(value);
			const source = await readFile(
				path.resolve(outputPath, "main.js"),
				"utf8"
			);
			expect(source).toContain(`inlined export .VALUE */${value}`);
		}
	}, 120000);

	// Every consumer bakes in its own copy, so invalidating one is not enough.
	it("should refresh an inlined literal in every consumer", async () => {
		await updateSrc({
			"index.js": `import { VALUE } from "./env.js";
import { FROM_A } from "./a.js";
import { FROM_B } from "./b.js";
export default [VALUE, FROM_A, FROM_B];
`,
			"a.js": `import { VALUE } from "./env.js";
export const FROM_A = VALUE;
`,
			"b.js": `import { VALUE } from "./env.js";
export const FROM_B = VALUE;
`
		});
		for (const value of [1, 2, 3]) {
			await updateSrc({ "env.js": `export const VALUE = ${value};\n` });
			await compile(inlineConfig);
			expect(execute()).toEqual([value, value, value]);
			const source = await readFile(
				path.resolve(outputPath, "main.js"),
				"utf8"
			);
			expect(source).not.toContain(`inlined export .VALUE */${value - 1}`);
		}
	}, 120000);

	// EnvironmentPlugin feeds DefinePlugin, so its values reach the inlined
	// literal without any module source changing.
	it("should invalidate consumer codegen when an EnvironmentPlugin value changes", async () => {
		const { EnvironmentPlugin } = require("../");

		const previous = process.env.WEBPACK_TEST_INLINE;
		try {
			await updateSrc({
				"index.js": `import { FLAG } from "./env.js";
export default FLAG;
`,
				"env.js": "export const FLAG = process.env.WEBPACK_TEST_INLINE;\n"
			});
			for (const value of ["on", "off"]) {
				process.env.WEBPACK_TEST_INLINE = value;
				await compile({
					...inlineConfig,
					plugins: [new EnvironmentPlugin(["WEBPACK_TEST_INLINE"])]
				});
				expect(execute()).toBe(value);
				const source = await readFile(
					path.resolve(outputPath, "main.js"),
					"utf8"
				);
				expect(source).toContain(
					`inlined export .FLAG */${JSON.stringify(value)}`
				);
			}
		} finally {
			process.env.WEBPACK_TEST_INLINE = previous;
		}
	}, 120000);

	// A chunk shared by two entrypoints carries a runtime set, which the module
	// graph hash walks down a different branch than a single named runtime.
	it("should refresh an inlined literal in a chunk shared by two runtimes", async () => {
		const configAdditions = {
			...inlineConfig,
			entry: { main: "./src/index.js", other: "./src/other.js" },
			optimization: {
				minimize: false,
				splitChunks: { chunks: "all", minSize: 0 }
			}
		};
		await updateSrc({
			"index.js": `import { FROM_SHARED } from "./shared.js";
export default FROM_SHARED;
`,
			"other.js": `import { FROM_SHARED } from "./shared.js";
export default FROM_SHARED;
`,
			"shared.js": `import { VALUE } from "./env.js";
export const FROM_SHARED = VALUE;
`
		});
		for (const value of [1, 2, 3]) {
			await updateSrc({ "env.js": `export const VALUE = ${value};\n` });
			await compile(configAdditions);
			expect(execute()).toBe(value);
			const emitted = await readdir(outputPath);
			const sources = await Promise.all(
				emitted
					.filter((name) => name.endsWith(".js"))
					.map((name) => readFile(path.resolve(outputPath, name), "utf8"))
			);
			expect(sources.join("\n")).not.toContain(
				`inlined export .VALUE */${value - 1}`
			);
		}
	}, 120000);

	// A JSON module's values reach consumers through the module graph, so a
	// cached one can hand back the previous document.
	it("should refresh a cached JSON module's values", async () => {
		await updateSrc({
			"index.js": `import data from "./data.json";
export default data;
`
		});
		for (const step of [0, 1, 2]) {
			await updateSrc({
				"data.json": JSON.stringify({
					value: step + 1,
					nested: { deep: `deep-${step}` }
				})
			});
			await compile(inlineConfig);
			expect(execute()).toEqual({
				value: step + 1,
				nested: { deep: `deep-${step}` }
			});
			const source = await readFile(
				path.resolve(outputPath, "main.js"),
				"utf8"
			);
			expect(source).not.toContain(`deep-${step - 1}`);
		}
	}, 120000);

	// The losing branch is removed at build time, so a stale build keeps code
	// the current configuration says is unreachable.
	it("should keep only the branch a changed define value selects", async () => {
		const { DefinePlugin } = require("../");

		await updateSrc({
			"index.js": `import { run } from "./feature.js";
export default run();
`,
			"feature.js": `export function run() {
	if (process.env.PICK === "p0") return "took-p0";
	if (process.env.PICK === "p1") return "took-p1";
	return "took-p2";
}
`
		});
		for (const step of [0, 1, 2]) {
			await compile({
				...inlineConfig,
				plugins: [
					new DefinePlugin({ "process.env.PICK": JSON.stringify(`p${step}`) })
				]
			});
			expect(execute()).toBe(`took-p${step}`);
			const source = await readFile(
				path.resolve(outputPath, "main.js"),
				"utf8"
			);
			for (const other of [0, 1, 2]) {
				if (other !== step) expect(source).not.toContain(`took-p${other}`);
			}
		}
	}, 120000);

	// A stale url still names a file an earlier build emitted, so reading the
	// file back catches a consumer that kept the previous hash.
	it("should point a cached consumer at a changed asset's content hash", async () => {
		const configAdditions = {
			...inlineConfig,
			output: {
				...config.output,
				publicPath: "",
				assetModuleFilename: "[name].[contenthash:8][ext]"
			},
			module: { rules: [{ test: /\.txt$/, type: "asset/resource" }] }
		};
		await updateSrc({
			"index.js": `import url from "./data.txt";
export default url;
`
		});
		for (const step of [0, 1, 2]) {
			await updateSrc({ "data.txt": `content-${step}\n` });
			await compile(configAdditions);
			const url = /** @type {string} */ (execute());
			const emitted = await readFile(
				path.resolve(outputPath, path.basename(url)),
				"utf8"
			);
			expect(emitted.trim()).toBe(`content-${step}`);
		}
	}, 120000);

	// The module source never changes; only the file the loader declared with
	// addDependency does, so the pack must not answer with the old result.
	it("should rebuild a cached loader result when its tracked file changed", async () => {
		await updateSrc({
			"loader.js": `const fs = require("fs");
const path = require("path");

const fileDep = path.resolve(__dirname, "tracked.txt");

module.exports = function () {
	this.addDependency(fileDep);
	return "module.exports = " + JSON.stringify(fs.readFileSync(fileDep, "utf8").trim()) + ";";
};
`,
			"stub.js": "module.exports = null;\n",
			"index.js": `import value from "./loader.js!./stub.js";
export default value;
`
		});
		for (const step of [0, 1, 2]) {
			await updateSrc({ "tracked.txt": `tracked-${step}\n` });
			await compile(inlineConfig);
			expect(execute()).toBe(`tracked-${step}`);
		}
	}, 120000);

	// Provided exports are stored per build hash, so a provider restored from
	// the pack can report the set it had when it was written.
	it("should see exports a cached provider gained between builds", async () => {
		await updateSrc({
			"index.js": `import * as ns from "./lib.js";
export default Object.keys(ns).sort();
`
		});
		const steps = [
			{ code: 'export const BASE = "base";\n', keys: ["BASE"] },
			{
				code: 'export const BASE = "base";\nexport const SECOND = "second";\n',
				keys: ["BASE", "SECOND"]
			},
			{
				code: 'export const BASE = "base";\nexport const THIRD = "third";\n',
				keys: ["BASE", "THIRD"]
			}
		];
		for (const step of steps) {
			await updateSrc({ "lib.js": step.code });
			await compile(inlineConfig);
			expect(execute()).toEqual(step.keys);
		}
	}, 120000);

	// The class names a CSS module exports are the keys its consumers destructure,
	// so a cached mapping outlives a stylesheet that renamed them.
	it("should refresh the class names a cached CSS module exports", async () => {
		await updateSrc({
			"index.js": `import * as styles from "./style.modules.css";
export default Object.keys(styles).sort();
`
		});
		for (const name of ["alpha", "beta", "alpha"]) {
			await updateSrc({
				"style.modules.css": `.${name} { color: red; }\n`
			});
			await compile(inlineConfig);
			expect(execute()).toEqual([name]);
		}
	}, 120000);

	// An alias lives in the configuration, which the pack reuses across builds
	// until cache.version says the configuration changed.
	it("should re-resolve an alias when the cache version marks the config changed", async () => {
		await updateSrc({
			"index.js": `import value from "my-alias";
export default value;
`,
			"target-a.js": 'export default "from-a";\n',
			"target-b.js": 'export default "from-b";\n'
		});
		for (const target of ["a", "b", "a"]) {
			await compile({
				...inlineConfig,
				cache: { version: `alias-${target}` },
				resolve: {
					alias: {
						...config.resolve.alias,
						"my-alias": path.resolve(srcPath, `target-${target}.js`)
					}
				}
			});
			expect(execute()).toBe(`from-${target}`);
		}
	}, 120000);

	// DefinePlugin hashes the set of keys separately from each value, so adding
	// one has to invalidate the modules that substituted the others.
	it("should re-substitute when the define key set changes", async () => {
		const { DefinePlugin } = require("../");

		await updateSrc({
			"index.js": `export default [
	typeof FIRST === "undefined" ? "none" : FIRST,
	typeof SECOND === "undefined" ? "none" : SECOND
];
`
		});
		const steps = [
			{ definitions: { FIRST: '"one"' }, expected: ["one", "none"] },
			{
				definitions: { FIRST: '"one"', SECOND: '"two"' },
				expected: ["one", "two"]
			},
			{ definitions: { SECOND: '"two"' }, expected: ["none", "two"] }
		];
		for (const step of steps) {
			await compile({
				...inlineConfig,
				plugins: [new DefinePlugin(step.definitions)]
			});
			expect(execute()).toEqual(step.expected);
		}
	}, 120000);
});
