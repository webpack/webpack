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
		fs.mkdir(inputDirectory, { recursive: true }, done);
	});
	it("should capture loader dependencies", async () => {
		fs.writeFileSync(
			path.resolve(inputDirectory, "loader-dependency.js"),
			"module.exports = 1;"
		);
		await exec("1");
		fs.writeFileSync(
			path.resolve(inputDirectory, "loader-dependency.js"),
			"module.exports = 2;"
		);
		await exec("2");
		// eslint-disable-next-line node/no-missing-require
		const first = require("./js/buildDeps/1/main.js");
		// eslint-disable-next-line node/no-missing-require
		const second = require("./js/buildDeps/2/main.js");
		expect(typeof first).toBe("number");
		expect(typeof second).toBe("number");
		expect(first).toBe(1);
		expect(second).toBe(2);
	}, 30000);
});
