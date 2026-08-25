"use strict";

require("./helpers/warmup-webpack");

const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");

const testPath = path.resolve(__dirname, "js/cache-exit-flush");
const cacheDirectory = path.join(testPath, "cache");
const outputDirectory = path.join(testPath, "output");
const runFile = path.resolve(__dirname, "fixtures/cache-exit-flush/run.js");

/**
 * Builds the fixture in a child process that never calls `compiler.close()`,
 * so only the exit flush can persist the pack.
 * @returns {Promise<{ modules: number, built: number }>} what the build reported
 */
const build = () =>
	new Promise((resolve, reject) => {
		childProcess.execFile(
			process.execPath,
			[runFile, cacheDirectory, outputDirectory],
			(err, stdout, stderr) => {
				if (err) {
					reject(new Error(`${err.message}\n${stdout}\n${stderr}`));
					return;
				}
				resolve(JSON.parse(stdout));
			}
		);
	});

describe("Cache persistence on exit", () => {
	beforeAll((done) => {
		rimraf(testPath, done);
	});

	it("stores the pack and restores it without `compiler.close()`", async () => {
		const first = await build();

		expect(first.built).toBe(first.modules);
		expect(
			fs.readdirSync(path.join(cacheDirectory, "default-development"))
		).toContain("index.pack");

		const second = await build();

		expect(second.modules).toBeGreaterThan(0);
		expect(second.built).toBe(0);
	}, 120000);
});
