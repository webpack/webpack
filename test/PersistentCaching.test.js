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

	beforeEach(done => {
		rimraf(tempPath, done);
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

	const compile = async (configAdditions = {}) =>
		new Promise((resolve, reject) => {
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
			data[file] = "export default 1;";
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
		await compile({ entry: "./src/main.js" });
		const firstCacheFiles = (await readdir(cachePath)).sort();
		// cSpell:words Mtimes
		const firstMtimes = firstCacheFiles.map(
			f => fs.statSync(path.join(cachePath, f)).mtime
		);

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
		const cacheFiles = (await readdir(cachePath)).sort();
		expect(cacheFiles).toStrictEqual(firstCacheFiles);
		expect(
			firstCacheFiles.map(f => fs.statSync(path.join(cachePath, f)).mtime)
			// cSpell:words Mtimes
		).toStrictEqual(firstMtimes);
	}, 20000);
});
