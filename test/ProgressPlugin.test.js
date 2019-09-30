"use strict";

const _ = require("lodash");
const path = require("path");
const MemoryFs = require("memory-fs");
const captureStdio = require("./helpers/captureStdio");

let webpack;

describe("ProgressPlugin", function() {
	let stderr;

	beforeEach(() => {
		stderr = captureStdio(process.stderr, true);
		webpack = require("../");
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
		process.stderr.columns = 31;

		return RunCompilerAsync(compiler).then(() => {
			const logs = getLogs(stderr.toString());

			expect(logs.length).toBeGreaterThan(20);
			logs.forEach(log => expect(log.length).toBeLessThanOrEqual(30));
			expect(logs).toContain(
				"77% ...timization ...nksPlugin",
				"trims each detail string equally"
			);
			expect(logs).toContain(
				"10% building ...dules 0 active",
				"remove empty arguments"
			);
			expect(logs).toContain(
				"10% building ...dules 1 active",
				"omit arguments when no space"
			);
			expect(logs).toContain("93% ...hunk asset optimization");
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
	compiler.outputFileSystem = new MemoryFs();

	new webpack.ProgressPlugin().apply(compiler);

	return compiler;
};

const createSimpleCompiler = () => {
	const compiler = webpack({
		context: path.join(__dirname, "fixtures"),
		entry: "./a.js"
	});

	compiler.outputFileSystem = new MemoryFs();

	new webpack.ProgressPlugin().apply(compiler);

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
