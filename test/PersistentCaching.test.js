require("./helpers/warmup-webpack");

const path = require("path");
const util = require("util");
const fs = require("fs");
const rimraf = require("rimraf");
const vm = require("vm");

const readdir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);
const utimes = util.promisify(fs.utimes);
const mkdir = util.promisify(fs.mkdir);
const rimrafProm = util.promisify(rimraf);

describe("Persistent Caching", () => {
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
			path: outputPath
		}
	};

	beforeEach(async () => {
		await rimrafProm(tempPath);
	});

	const updateSrc = async data => {
		const ts = new Date(Date.now() - 10000);
		await mkdir(srcPath, { recursive: true });
		for (const key of Object.keys(data)) {
			const p = path.resolve(srcPath, key);
			await writeFile(p, data[key]);
			await utimes(p, ts, ts);
		}
	};

	const compile = async (configAdditions = {}) => {
		return new Promise((resolve, reject) => {
			const webpack = require("../");
			webpack(
				{
					...config,
					...configAdditions,
					cache: { ...config.cache, ...configAdditions.cache }
				},
				(err, stats) => {
					if (err) return reject(err);
					if (stats.hasErrors())
						return reject(stats.toString({ preset: "errors-only" }));
					resolve(stats);
				}
			);
		});
	};

	const execute = () => {
		const cache = {};
		const require = name => {
			if (cache[name]) return cache[name].exports;
			if (!name.endsWith(".js")) name += ".js";
			const p = path.resolve(outputPath, name);
			const source = fs.readFileSync(p, "utf-8");
			const context = {};
			const fn = vm.runInThisContext(
				`(function(require, module, exports) { ${source} })`,
				context,
				{
					filename: p
				}
			);
			const m = { exports: {} };
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
			data[file] = `export default 1;`;
		}
		await updateSrc(data);
		await compile({ cache: { compression: false } });
		expect(execute()).toBe(30);
		for (let i = 0; i < 30; i++) {
			updateSrc({
				[files[i]]: `export default 2;`,
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
		const c = items => {
			const entry = {};
			for (const item of items.split("")) entry[item] = `./src/${item}.js`;
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
		await compile({ entry: `./src/main.js` });
		const firstCacheFiles = (await readdir(cachePath)).sort();
		// cSpell:words Mtimes
		const firstMtimes = firstCacheFiles.map(
			f => fs.statSync(path.join(cachePath, f)).mtime
		);

		await updateSrc({
			"main.js": `†e
	import 'lodash';
				`
		});
		await compile({
			entry: `./src/main.js`,
			cache: {
				...config.cache,
				readonly: true
			}
		});
		const cacheFiles = (await readdir(cachePath)).sort();
		expect(cacheFiles).toStrictEqual(firstCacheFiles);
		expect(
			firstCacheFiles.map(f => fs.statSync(path.join(cachePath, f)).mtime)
			// cSpell:words Mtimes
		).toStrictEqual(firstMtimes);
	}, 20000);

	describe("cache hit rate", () => {
		class CacheHitRateDetector {
			apply(compiler) {
				this.hitMap = {};
				const configure = name => {
					if (!this.hitMap[name])
						this.hitMap[name] = { hits: 0, calls: 0, stores: 0 };
				};
				const countStore = name => {
					configure(name);
					this.hitMap[name].stores++;
				};
				const countCall = name => {
					configure(name);
					this.hitMap[name].calls++;
				};
				const countHit = name => {
					configure(name);
					this.hitMap[name].hits++;
				};
				compiler.cache.hooks.store.intercept({
					register: ctx => {
						const origFn = ctx.fn;
						if (ctx.type === "promise") {
							const wrapper = async (...args) => {
								countStore(ctx.name);
								const result = await origFn(...args);
								if (result) countHit(ctx.name);
								return result;
							};
							ctx.fn = wrapper;
						} else {
							const wrapper = (identifier, etag, data) => {
								countStore(ctx.name);
								const result = origFn(identifier, etag, data);
								if (result) countHit(ctx.name);
								return result;
							};
							ctx.fn = wrapper;
						}
					}
				});
				compiler.cache.hooks.get.intercept({
					register: ctx => {
						const origFn = ctx.fn;
						if (ctx.type === "promise") {
							const wrapper = async (identifier, etag, gotHandlers) => {
								countCall(ctx.name);
								const result = await origFn(identifier, etag, gotHandlers);
								if (result) countHit(ctx.name);
								return result;
							};
							ctx.fn = wrapper;
						} else {
							const wrapper = (identifier, etag, gotHandlers) => {
								countCall(ctx.name);
								const result = origFn(identifier, etag, gotHandlers);
								if (result) countHit(ctx.name);
								return result;
							};
							ctx.fn = wrapper;
						}
					}
				});
			}
		}
		it("should have a 100% hit rate when run twice back to back", async () => {
			await updateSrc({
				"main.js": `
		import { sum } from 'lodash';

		sum([1,2,3])
					`
			});
			const compile1Plugin = new CacheHitRateDetector();
			await compile({
				entry: `./src/main.js`,
				plugins: [compile1Plugin]
			});
			await rimrafProm(outputPath);

			expect(compile1Plugin.hitMap).toEqual({
				IdleFileCachePlugin: {
					calls: 13,
					hits: 0,
					stores: 13
				},
				MemoryCachePlugin: {
					calls: 13,
					hits: 0,
					stores: 13
				}
			});

			const compile2Plugin = new CacheHitRateDetector();
			await compile({
				entry: `./src/main.js`,
				plugins: [compile2Plugin]
			});
			expect(compile2Plugin.hitMap).toEqual({
				IdleFileCachePlugin: {
					calls: 13,
					hits: 13
				},
				MemoryCachePlugin: {
					calls: 13,
					hits: 0,
					stores: 13
				}
			});
		});

		it("should have a 100% hit rate when run twice back to back with sourcemaps enabled.", async () => {
			await updateSrc({
				"main.js": `
		import { sum } from 'lodash';

		sum([1,2,3])
					`
			});
			const compile1Plugin = new CacheHitRateDetector();
			await compile({
				entry: `./src/main.js`,
				devtool: "source-map",
				plugins: [compile1Plugin]
			});
			expect(() =>
				fs.statSync(path.join(outputPath, "main.js.map"))
			).not.toThrow();
			await rimrafProm(outputPath);

			expect(compile1Plugin.hitMap).toEqual({
				IdleFileCachePlugin: {
					calls: 14,
					hits: 0,
					stores: 14
				},
				MemoryCachePlugin: {
					calls: 14,
					hits: 0,
					stores: 14
				}
			});

			const compile2Plugin = new CacheHitRateDetector();
			await compile({
				entry: `./src/main.js`,
				devtool: "source-map",
				plugins: [compile2Plugin]
			});
			expect(() =>
				fs.statSync(path.join(outputPath, "main.js.map"))
			).not.toThrow();
			expect(compile2Plugin.hitMap).toEqual({
				IdleFileCachePlugin: {
					calls: 14,
					stores: 0,
					hits: 14
				},
				MemoryCachePlugin: {
					calls: 14,
					hits: 0,
					stores: 0
				}
			});
		});

		it("should have a 0% hit rate when run first without sourcemaps, then with sourcemaps", async () => {
			await updateSrc({
				"main.js": `
			import { sum } from 'lodash';

			sum([1,2,3])
						`
			});
			const compile1Plugin = new CacheHitRateDetector();
			await compile({
				entry: `./src/main.js`,
				plugins: [compile1Plugin]
			});
			await rimrafProm(outputPath);

			expect(compile1Plugin.hitMap).toEqual({
				IdleFileCachePlugin: {
					calls: 13,
					hits: 0,
					stores: 13
				},
				MemoryCachePlugin: {
					calls: 13,
					hits: 0,
					stores: 13
				}
			});

			const compile2Plugin = new CacheHitRateDetector();
			await compile({
				entry: `./src/main.js`,
				devtool: "source-map",
				plugins: [compile2Plugin]
			});
			expect(() =>
				fs.statSync(path.join(outputPath, "main.js.map"))
			).not.toThrow();
			expect(compile2Plugin.hitMap).toEqual({
				IdleFileCachePlugin: {
					calls: 14,
					hits: 0,
					stores: 14
				},
				MemoryCachePlugin: {
					calls: 14,
					hits: 0,
					stores: 14
				}
			});
		});

		it("should have a 100% hit rate when run first with sourcemaps, then without sourcemaps", async () => {
			await updateSrc({
				"main.js": `
			import { sum } from 'lodash';

			sum([1,2,3])
						`
			});
			const compile1Plugin = new CacheHitRateDetector();
			await compile({
				entry: `./src/main.js`,
				devtool: "source-map",
				plugins: [compile1Plugin]
			});

			expect(() =>
				fs.statSync(path.join(outputPath, "main.js.map"))
			).not.toThrow();
			await rimrafProm(outputPath);
			expect(compile1Plugin.hitMap).toEqual({
				IdleFileCachePlugin: {
					calls: 14,
					hits: 0,
					stores: 14
				},
				MemoryCachePlugin: {
					calls: 14,
					hits: 0,
					stores: 14
				}
			});

			const compile2Plugin = new CacheHitRateDetector();
			await compile({
				entry: `./src/main.js`,
				plugins: [compile2Plugin]
			});
			expect(() => fs.statSync(path.join(outputPath, "main.js.map"))).toThrow();
			expect(compile2Plugin.hitMap).toEqual({
				IdleFileCachePlugin: {
					calls: 13,
					hits: 13,
					stores: 0
				},
				MemoryCachePlugin: {
					calls: 13,
					hits: 0,
					stores: 0
				}
			});
		});
	});
});
