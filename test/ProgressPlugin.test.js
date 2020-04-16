"use strict";

const _ = require("lodash");
const path = require("path");
const { createFsFromVolume, Volume } = require("memfs");
const captureStdio = require("./helpers/captureStdio");

let webpack;

describe("ProgressPlugin", function() {
	let stderr;

	beforeEach(() => {
		stderr = captureStdio(process.stderr, true);
		webpack = require("..");
	});
	afterEach(() => {
		stderr && stderr.restore();
	});

	it("should not contain NaN as a percentage when it is applied to MultiCompiler", () => {
		const compiler = createMultiCompiler();

		return RunCompilerAsync(compiler).then(() => {
			expect(stderr.toString()).toContain("%");
			expect(stderr.toString()).not.toContain("NaN");
		});
	});

	it("should not print lines longer than stderr.columns", () => {
		const compiler = createSimpleCompiler();
		process.stderr.columns = 36;

		return RunCompilerAsync(compiler).then(() => {
			const logs = getLogs(stderr.toString());

			expect(logs.length).toBeGreaterThan(20);
			logs.forEach(log => expect(log.length).toBeLessThanOrEqual(35));
			expect(logs).toContain(
				"75% ...optimization ...ChunksPlugin",
				"trims each detail string equally"
			);
			expect(logs).toContain(
				"10% ...ding ...ries ...cies ...ules",
				"remove empty arguments and omit arguments when no space"
			);
			expect(logs).toContain("91% after chunk asset optimization");
			expect(logs).toContain("100%");
		});
	});

	it("should handle when stderr.columns is undefined", () => {
		const compiler = createSimpleCompiler();

		process.stderr.columns = undefined;
		return RunCompilerAsync(compiler).then(() => {
			const logs = getLogs(stderr.toString());

			expect(logs.length).toBeGreaterThan(20);
			expect(_.maxBy(logs, "length").length).toBeGreaterThan(50);
		});
	});

	it("should display all type of percentage when it is applied to SingleCompiler", () => {
		const compiler = createSimpleCompiler({
			entries: true,
			modules: true,
			dependencies: true,
			activeModules: true
		});

		return RunCompilerAsync(compiler).then(() => {
			const logs = stderr.toString();

			expect(logs).toEqual(expect.stringMatching(/\d+\/\d+ entries/));
			expect(logs).toEqual(expect.stringMatching(/\d+\/\d+ dependencies/));
			expect(logs).toEqual(expect.stringMatching(/\d+\/\d+ modules/));
			expect(logs).toEqual(expect.stringMatching(/\d+ active/));
		});
	});
});

const createMultiCompiler = () => {
	const compiler = webpack([
		{
			context: path.join(__dirname, "fixtures"),
			entry: "./a.js"
		},
		{
			context: path.join(__dirname, "fixtures"),
			entry: "./b.js"
		}
	]);
	compiler.outputFileSystem = createFsFromVolume(new Volume());

	new webpack.ProgressPlugin().apply(compiler);

	return compiler;
};

const createSimpleCompiler = progressOptions => {
	const compiler = webpack({
		context: path.join(__dirname, "fixtures"),
		entry: "./a.js"
	});

	compiler.outputFileSystem = createFsFromVolume(new Volume());

	new webpack.ProgressPlugin({
		activeModules: true,
		...progressOptions
	}).apply(compiler);

	return compiler;
};

const getLogs = logsStr => logsStr.split(/\r/).filter(v => !(v === " "));

const RunCompilerAsync = compiler =>
	new Promise((resolve, reject) => {
		compiler.run(err => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
