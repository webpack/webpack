"use strict";

const path = require("path");
const MemoryFs = require("memory-fs");
const webpack = require("../");
const { Stdio, RunCompilerAsync } = require("./support/utils");

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
	return compiler;
};

describe("ProgressPlugin", function() {
	let _env;
	let stderr;

	beforeEach(() => {
		_env = process.env;
		stderr = Stdio.capture(process.stderr);
	});
	afterEach(() => {
		process.env = _env;
		stderr && stderr.restore();
	});

	it("should not contain NaN as a percentage when it is applied to MultiCompiler", () => {
		const compiler = createMultiCompiler();

		new webpack.ProgressPlugin().apply(compiler);

		return RunCompilerAsync(compiler).then(() => {
			expect(stderr.toString()).not.toContain("NaN");
		});
	});

	it("should not print lines longer than stderr.columns or 40", () => {
		const compiler = webpack({
			context: path.join(__dirname, "fixtures"),
			entry: "./a.js"
		});

		compiler.outputFileSystem = new MemoryFs();

		new webpack.ProgressPlugin().apply(compiler);

		process.stderr.columns = 10;

		return RunCompilerAsync(compiler)
			.then(() => {
				const logs = stderr
					.toString()
					.split(/+/)
					.filter(v => !(v === " "));

				expect(logs.length).toBeGreaterThan(20);
				logs.map(v => expect(v.length).toBeLessThanOrEqual(10));

				process.stderr.columns = undefined;
			})
			.then(() => RunCompilerAsync(compiler))
			.then(() => {
				const logs = stderr
					.toString()
					.split(/+/)
					.filter(v => !(v === " "));

				expect(logs.length).toBeGreaterThan(20);
				logs.map(v => expect(v.length).toBeLessThanOrEqual(40));
			});
	});
});
