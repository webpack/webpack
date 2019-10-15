"use strict";

const path = require("path");
const child_process = require("child_process");
const fs = require("fs");
const rimraf = require("rimraf");

const cacheDirectory = path.resolve(__dirname, "js/buildDepsCache");
const outputDirectory = path.resolve(__dirname, "js/buildDeps");
const inputDirectory = path.resolve(__dirname, "js/buildDepsInput");

const exec = n => {
	return new Promise((resolve, reject) => {
		const p = child_process.fork(
			path.resolve(__dirname, "fixtures/buildDependencies/run.js"),
			[n],
			{ stdio: ["ignore", "pipe", "inherit", "ipc"] }
		);
		const chunks = [];
		p.stdout.on("data", chunk => chunks.push(chunk));
		p.once("exit", code => {
			const stdout = Buffer.concat(chunks).toString("utf-8");
			if (code === 0) {
				resolve(stdout);
			} else {
				reject(new Error(`Code ${code}: ${stdout}`));
			}
		});
		p.once("error", err => reject(err));
	});
};

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
			"module.exports = 1;"
		);
		fs.writeFileSync(
			path.resolve(inputDirectory, "config-dependency.js"),
			"module.exports = 1;"
		);
		await exec("0");
		fs.writeFileSync(
			path.resolve(inputDirectory, "loader-dependency.js"),
			"module.exports = Date.now();"
		);
		const now1 = Date.now();
		await exec("1");
		await exec("2");
		fs.writeFileSync(
			path.resolve(inputDirectory, "config-dependency"),
			"module.exports = Date.now();"
		);
		const now2 = Date.now();
		await exec("3");
		const now3 = Date.now();
		await exec("4");
		const results = Array.from({ length: 5 }).map((_, i) =>
			require(`./js/buildDeps/${i}/main.js`)
		);
		for (const r of results) {
			expect(typeof r.loader).toBe("number");
			expect(typeof r.config).toBe("number");
			expect(typeof r.uncached).toBe("number");
		}
		expect(results[0].loader).toBe(1);
		expect(results[0].config).toBe(1);
		expect(results[0].uncached).toBe(1);
		// 0 -> 1 should be invalidated
		expect(results[1].loader).toBeGreaterThan(now1);
		expect(results[1].config).toBe(1);
		expect(results[1].uncached).toBe(1);
		// 1 -> 2 should stay cached
		expect(results[2].loader).toBe(results[1].loader);
		expect(results[2].config).toBe(1);
		expect(results[2].uncached).toBe(1);
		// 2 -> 3 should be invalidated
		expect(results[3].loader).toBeGreaterThan(now2);
		expect(results[3].config).toBeGreaterThan(now2);
		expect(results[3].uncached).toBe(results[3].config);
		// 3 -> 4 should stay cached, but uncacheable module still rebuilds
		expect(results[4].loader).toBe(results[3].loader);
		expect(results[4].config).toBe(results[3].config);
		expect(results[4].uncached).toBeGreaterThan(now3);
	}, 100000);
});
