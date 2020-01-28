const path = require("path");
const util = require("util");
const fs = require("fs");
const rimraf = require("rimraf");
const vm = require("vm");
const webpack = require("../");

const readFile = util.promisify(fs.readFile);
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
			library: "result",
			libraryExport: "default",
			path: outputPath
		}
	};

	beforeAll(done => {
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

	const compile = async () => {
		return new Promise((resolve, reject) => {
			webpack(config, (err, stats) => {
				if (err) return reject(err);
				resolve(stats);
			});
		});
	};

	const execute = async () => {
		const p = path.resolve(outputPath, "main.js");
		const source = await readFile(p, "utf-8");
		const context = {};
		const fn = vm.runInThisContext(
			`(function() { ${source}\nreturn result; })`,
			context,
			p
		);
		return fn();
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
		expect(await execute()).toBe(30);
		for (let i = 0; i < 30; i++) {
			updateSrc({
				[files[i]]: `export default 2;`
			});
			await compile();
			expect(await execute()).toBe(31 + i);
		}
		const cacheFiles = await readdir(cachePath);
		expect(cacheFiles.length).toBeLessThan(20);
		expect(cacheFiles.length).toBeGreaterThan(10);
	}, 60000);
});
