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
		const p = child_process.fork(
			path.resolve(__dirname, "fixtures/buildDependencies/run.js"),
			[n, JSON.stringify(options)],
			{ stdio: ["ignore", "pipe", "pipe", "ipc"] }
		);
		const chunks = [];
		p.stderr.on("data", chunk => chunks.push(chunk));
		p.stdout.on("data", chunk => chunks.push(chunk));
		p.once("exit", code => {
			const stdout = Buffer.concat(chunks).toString("utf-8");
			if (code === 0) {
				if (!options.ignoreErrors && /<[ew]>/.test(stdout))
					return reject(stdout);
				resolve(stdout);
			} else {
				reject(new Error(`Code ${code}: ${stdout}`));
			}
		});
		p.once("error", err => reject(err));
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
		expect(await exec("2")).toMatch(/Captured build dependencies/);
		expect(await exec("3")).not.toMatch(/Captured build dependencies/);
		fs.writeFileSync(
			path.resolve(inputDirectory, "config-dependency"),
			"module.exports = Date.now();"
		);
		const now2 = Date.now();
		await exec("4");
		const now3 = Date.now();
		await exec("5");
		let now4, now5;
		if (supportsEsm) {
			fs.writeFileSync(
				path.resolve(inputDirectory, "esm-dependency.js"),
				"module.exports = Date.now();"
			);
			now4 = Date.now();
			await exec("6");
			fs.writeFileSync(
				path.resolve(inputDirectory, "esm-async-dependency.mjs"),
				"export default Date.now();"
			);
			now5 = Date.now();
			await exec("7");
		}
		const results = Array.from({ length: supportsEsm ? 8 : 6 }).map((_, i) =>
			require(`./js/buildDeps/${i}/main.js`)
		);
		for (const r of results) {
			expect(typeof r.loader).toBe("number");
			expect(typeof r.config).toBe("number");
			expect(typeof r.uncached).toBe("number");
		}
		expect(results[0].loader).toBe(0);
		expect(results[0].config).toBe(0);
		if (supportsEsm) expect(results[0].esmConfig).toBe(0);
		expect(results[0].uncached).toBe(0);
		// 0 -> 1 should not cache at all because of invalid buildDeps
		expect(results[1].loader).toBe(1);
		expect(results[1].config).toBe(1);
		expect(results[1].esmConfig).toBe(1);
		expect(results[1].uncached).toBe(1);
		// 1 -> 2 should be invalidated
		expect(results[2].loader).toBeGreaterThan(now1);
		expect(results[2].config).toBe(1);
		expect(results[2].esmConfig).toBe(1);
		expect(results[2].uncached).toBe(1);
		// 2 -> 3 should stay cached
		expect(results[3].loader).toBe(results[2].loader);
		expect(results[3].config).toBe(1);
		expect(results[3].esmConfig).toBe(1);
		expect(results[3].uncached).toBe(1);
		// 3 -> 4 should be invalidated
		expect(results[4].loader).toBeGreaterThan(now2);
		expect(results[4].config).toBeGreaterThan(now2);
		expect(results[4].esmConfig).toBe(1);
		expect(results[4].uncached).toBe(results[4].config);
		// 4 -> 5 should stay cached, but uncacheable module still rebuilds
		expect(results[5].loader).toBe(results[4].loader);
		expect(results[5].config).toBe(results[4].config);
		expect(results[5].uncached).toBeGreaterThan(now3);
		if (supportsEsm) {
			// 5 -> 6 should be invalidated
			expect(results[6].loader).toBeGreaterThan(now4);
			expect(results[6].config).toBeGreaterThan(now4);
			expect(results[6].esmConfig).toBeGreaterThan(now4);
			expect(results[6].uncached).toBeGreaterThan(now4);
			// 6 -> 7 should be invalidated
			expect(results[7].loader).toBeGreaterThan(now5);
			expect(results[7].config).toBeGreaterThan(now5);
			expect(results[7].esmConfig).toBeGreaterThan(now5);
			expect(results[7].esmAsyncConfig).toBeGreaterThan(now5);
			expect(results[7].uncached).toBeGreaterThan(now5);
		}
	}, 100000);
});
