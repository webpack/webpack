"use strict";

const path = require("path");
const child_process = require("child_process");
const fs = require("fs");
const rimraf = require("rimraf");

const cacheDirectory = path.resolve(__dirname, "js/buildDepsCache");
const outputDirectory = path.resolve(__dirname, "js/buildDeps");
const inputDirectory = path.resolve(__dirname, "js/buildDepsInput");

const exec = (n, options = {}) => {
	return new Promise((resolve, reject) => {
		const webpack = require("../");
		const coverageEnabled = webpack.toString().includes("++");

		const p = child_process.execFile(
			process.execPath,
			[
				...(coverageEnabled
					? [
							require.resolve("nyc/bin/nyc.js"),
							"--silent",
							"--no-clean",
							"--cache-dir",
							".jest-cache/nyc",
							process.execPath
					  ]
					: []),
				path.resolve(__dirname, "fixtures/buildDependencies/run.js"),
				n,
				JSON.stringify(options)
			],
			{
				stdio: ["ignore", "pipe", "pipe"]
			}
		);
		const chunks = [];
		p.stderr.on("data", chunk => chunks.push(chunk));
		p.stdout.on("data", chunk => chunks.push(chunk));
		p.once("exit", code => {
			const stdout = chunks.join("");
			if (code === 0) {
				if (!options.ignoreErrors && /<[ew]>/.test(stdout))
					return reject(stdout);
				resolve(stdout);
			} else {
				reject(new Error(`Code ${code}: ${stdout}`));
			}
		});
		p.once("error", err => {
			const stdout = chunks.join("");
			console.log(stdout);
			reject(err);
		});
	});
};

const supportsEsm = +process.versions.modules >= 83;

describe("BuildDependencies", () => {
	beforeEach(done => {
		rimraf(cacheDirectory, done);
	});
	beforeEach(done => {
		rimraf(outputDirectory, done);
	});

	beforeEach(done => {
		rimraf(inputDirectory, done);
	});
	beforeEach(done => {
		fs.mkdir(inputDirectory, { recursive: true }, done);
	});
	it("should capture loader and config dependencies", async () => {
		fs.writeFileSync(
			path.resolve(inputDirectory, "package.json"),
			JSON.stringify({
				name: "yep",
				version: "1.0.0"
			})
		);
		fs.writeFileSync(
			path.resolve(inputDirectory, "loader-dependency.js"),
			"module.exports = 0;"
		);
		fs.writeFileSync(
			path.resolve(inputDirectory, "config-dependency.js"),
			"module.exports = 0;"
		);
		fs.writeFileSync(
			path.resolve(inputDirectory, "esm-dependency.js"),
			"module.exports = 0;"
		);
		fs.writeFileSync(
			path.resolve(inputDirectory, "esm-async-dependency.mjs"),
			"export default 0;"
		);
		await exec("0", {
			invalidBuildDepdencies: true,
			buildTwice: true,
			ignoreErrors: true
		});
		fs.writeFileSync(
			path.resolve(inputDirectory, "loader-dependency.js"),
			"module.exports = 1;"
		);
		fs.writeFileSync(
			path.resolve(inputDirectory, "config-dependency.js"),
			"module.exports = 1;"
		);
		fs.writeFileSync(
			path.resolve(inputDirectory, "esm-dependency.js"),
			"module.exports = 1;"
		);
		await exec("1");
		fs.writeFileSync(
			path.resolve(inputDirectory, "loader-dependency.js"),
			"module.exports = Date.now();"
		);
		const now1 = Date.now();
		const output2 = await exec("2");
		expect(output2).toMatch(/but build dependencies have changed/);
		expect(output2).toMatch(/Captured build dependencies/);
		expect(output2).not.toMatch(/Assuming/);
		expect(output2).not.toMatch(/<w>/);
		const output3 = await exec("3");
		expect(output3).not.toMatch(/resolving of build dependencies is invalid/);
		expect(output3).not.toMatch(/but build dependencies have changed/);
		expect(output3).not.toMatch(/Captured build dependencies/);
		expect(output3).not.toMatch(/Assuming/);
		expect(output3).not.toMatch(/<w>/);
		fs.writeFileSync(
			path.resolve(inputDirectory, "package.json"),
			JSON.stringify({
				name: "other",
				version: "2.0.0"
			})
		);
		const output4 = await exec("4");
		expect(output4).toMatch(/resolving of build dependencies is invalid/);
		expect(output4).not.toMatch(/but build dependencies have changed/);
		expect(output4).toMatch(/Captured build dependencies/);
		fs.writeFileSync(
			path.resolve(inputDirectory, "config-dependency"),
			"module.exports = Date.now();"
		);
		const now2 = Date.now();
		await exec("5");
		const now3 = Date.now();
		await exec("6");
		await exec("7", {
			definedValue: "other"
		});
		let now4, now5;
		if (supportsEsm) {
			fs.writeFileSync(
				path.resolve(inputDirectory, "esm-dependency.js"),
				"module.exports = Date.now();"
			);
			now4 = Date.now();
			await exec("8", {
				definedValue: "other"
			});
			fs.writeFileSync(
				path.resolve(inputDirectory, "esm-async-dependency.mjs"),
				"export default Date.now();"
			);
			now5 = Date.now();

			await exec("9", {
				definedValue: "other"
			});
		}
		const results = Array.from({ length: supportsEsm ? 10 : 8 }).map((_, i) =>
			require(`./js/buildDeps/${i}/main.js`)
		);
		for (const r of results) {
			expect(typeof r.loader).toBe("number");
			expect(typeof r.config).toBe("number");
			expect(typeof r.uncached).toBe("number");
			expect(typeof r.definedValue).toBe("string");
		}
		let result = results.shift();
		expect(result.loader).toBe(0);
		expect(result.config).toBe(0);
		if (supportsEsm) expect(result.esmConfig).toBe(0);
		expect(result.uncached).toBe(0);
		// 0 -> 1 should not cache at all because of invalid buildDeps
		result = results.shift();
		expect(result.loader).toBe(1);
		expect(result.config).toBe(1);
		expect(result.esmConfig).toBe(1);
		expect(result.uncached).toBe(1);
		// 1 -> 2 should be invalidated
		result = results.shift();
		expect(result.loader).toBeGreaterThan(now1);
		expect(result.config).toBe(1);
		expect(result.esmConfig).toBe(1);
		expect(result.uncached).toBe(1);
		// 2 -> 3 should stay cached
		let prevResult = result;
		result = results.shift();
		expect(result.loader).toBe(prevResult.loader);
		expect(result.config).toBe(1);
		expect(result.esmConfig).toBe(1);
		expect(result.uncached).toBe(1);
		// 3 -> 4 should stay cached
		prevResult = result;
		result = results.shift();
		expect(result.loader).toBe(prevResult.loader);
		expect(result.config).toBe(1);
		expect(result.esmConfig).toBe(1);
		expect(result.uncached).toBe(1);
		// 4 -> 5 should be invalidated
		result = results.shift();
		expect(result.loader).toBeGreaterThan(now2);
		expect(result.config).toBeGreaterThan(now2);
		expect(result.esmConfig).toBe(1);
		expect(result.uncached).toBe(result.config);
		// 5 -> 6 should stay cached, but uncacheable module still rebuilds
		prevResult = result;
		result = results.shift();
		expect(result.loader).toBe(prevResult.loader);
		expect(result.config).toBe(prevResult.config);
		expect(result.uncached).toBeGreaterThan(now3);
		// 6 -> 7 should stay cached, except the updated defined value
		prevResult = result;
		result = results.shift();
		expect(result.loader).toBe(prevResult.loader);
		expect(result.config).toBe(prevResult.config);
		expect(result.definedValue).toBe("other");
		if (supportsEsm) {
			// 7 -> 8 should be invalidated
			result = results.shift();
			expect(result.loader).toBeGreaterThan(now4);
			expect(result.config).toBeGreaterThan(now4);
			expect(result.esmConfig).toBeGreaterThan(now4);
			expect(result.uncached).toBeGreaterThan(now4);
			// 8 -> 9 should be invalidated
			result = results.shift();
			expect(result.loader).toBeGreaterThan(now5);
			expect(result.config).toBeGreaterThan(now5);
			expect(result.esmConfig).toBeGreaterThan(now5);
			expect(result.esmAsyncConfig).toBeGreaterThan(now5);
			expect(result.uncached).toBeGreaterThan(now5);
		}
	}, 500000);
});
