const path = require("path");
const util = require("util");
const fs = require("fs");
const rimraf = require("rimraf");
const vm = require("vm");
const webpack = require("../");

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

	const compile = async (configAdditions = {}) => {
		return new Promise((resolve, reject) => {
			webpack({ ...config, ...configAdditions }, (err, stats) => {
				if (err) return reject(err);
				if (stats.hasErrors())
					return reject(stats.toString({ preset: "errors-only" }));
				resolve(stats);
			});
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

	it("should merge multiple small files", async () => {
		const files = Array.from({ length: 30 }).map((_, i) => `file${i}.js`);
		const data = {
			"index.js": `

${files.map((f, i) => `import f${i} from "./${f}";`).join("\n")}

export default ${files.map((_, i) => `f${i}`).join(" + ")};
`
		};
		for (const file of files) {
			data[file] = `export default 1;`;
		}
		await updateSrc(data);
		await compile();
		expect(execute()).toBe(30);
		for (let i = 0; i < 30; i++) {
			updateSrc({
				[files[i]]: `export default 2;`
			});
			await compile();
			expect(execute()).toBe(31 + i);
		}
		const cacheFiles = await readdir(cachePath);
		expect(cacheFiles.length).toBeLessThan(20);
		expect(cacheFiles.length).toBeGreaterThan(10);
	}, 60000);

	it("should optimize unused content", async () => {
		const data = {
			"a.js": 'import "react-dom";',
			"b.js": 'import "acorn";',
			"c.js": 'import "core-js";',
			"d.js": 'import "date-fns";',
			"e.js": 'import "lodash";'
		};
		const createEntry = items => {
			const entry = {};
			for (const item of items.split("")) entry[item] = `./src/${item}.js`;
			return entry;
		};
		await updateSrc(data);
		await compile({ entry: createEntry("abcde") });
		await compile({ entry: createEntry("abc") });
		await compile({ entry: createEntry("cde") });
		await compile({ entry: createEntry("acd") });
		await compile({ entry: createEntry("bce") });
		await compile({ entry: createEntry("abcde") });
		const cacheFiles = await readdir(cachePath);
		expect(cacheFiles.length).toBeGreaterThan(4);
	}, 60000);

	it("should allow persistent caching of container related objects", async () => {
		const data = {
			"index.js":
				"export default import('container/src/exposed').then(m => m.default);",
			"exposed.js": "import lib from 'lib'; export default 21 + lib;",
			"lib.js": "export default 20",
			"lib2.js": "export default 21"
		};
		await updateSrc(data);
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
	}, 60000);
});
