"use strict";

const _ = require("lodash");
const path = require("path");
const { createFsFromVolume, Volume } = require("memfs");
const webpack = require("..");
const captureStdio = require("./helpers/captureStdio");

const createMultiCompiler = (progressOptions, configOptions) => {
	const compiler = webpack(
		Object.assign(
			[
				{
					context: path.join(__dirname, "fixtures"),
					entry: "./a.js"
				},
				{
					context: path.join(__dirname, "fixtures"),
					entry: "./b.js"
				}
			],
			configOptions
		)
	);
	compiler.outputFileSystem = createFsFromVolume(new Volume());

	new webpack.ProgressPlugin(progressOptions).apply(compiler);

	return compiler;
};

const createSimpleCompiler = progressOptions => {
	const compiler = webpack({
		context: path.join(__dirname, "fixtures"),
		entry: "./a.js",
		infrastructureLogging: {
			debug: /Progress/
		}
	});

	compiler.outputFileSystem = createFsFromVolume(new Volume());

	new webpack.ProgressPlugin({
		activeModules: true,
		...progressOptions
	}).apply(compiler);

	return compiler;
};

const createSimpleCompilerWithCustomHandler = options => {
	const compiler = webpack({
		context: path.join(__dirname, "fixtures"),
		entry: "./a.js"
	});

	compiler.outputFileSystem = createFsFromVolume(new Volume());
	const logger = compiler.getInfrastructureLogger("custom test logger");
	new webpack.ProgressPlugin({
		activeModules: true,
		...options,
		handler: (...args) => logger.status(args)
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

describe("ProgressPlugin", function () {
	let stderr;
	let stdout;

	beforeEach(() => {
		stderr = captureStdio(process.stderr, true);
		stdout = captureStdio(process.stdout, true);
	});
	afterEach(() => {
		stderr && stderr.restore();
		stdout && stdout.restore();
	});

	const nanTest = createCompiler => () => {
		const compiler = createCompiler();

		return RunCompilerAsync(compiler).then(() => {
			expect(stderr.toString()).toContain("%");
			expect(stderr.toString()).not.toContain("NaN");
		});
	};

	it(
		"should not contain NaN as a percentage when it is applied to Compiler",
		nanTest(createSimpleCompiler)
	);
	it(
		"should not contain NaN as a percentage when it is applied to MultiCompiler",
		nanTest(createMultiCompiler)
	);
	it(
		"should not contain NaN as a percentage when it is applied to MultiCompiler (paralellism: 1)",
		nanTest(() => createMultiCompiler(undefined, { parallelism: 1 }))
	);

	it("should print profile information", () => {
		const compiler = createSimpleCompiler({
			profile: true
		});

		return RunCompilerAsync(compiler).then(() => {
			const logs = getLogs(stderr.toString());

			expect(logs).toContainEqual(
				expect.stringMatching(
					/\[webpack\.Progress\] {2}| {2}| \d+ ms module ids > DeterministicModuleIdsPlugin\n$/
				)
			);
			expect(logs).toContainEqual(
				expect.stringMatching(
					/\[webpack\.Progress\] {2}| \d+ ms building > \.\.\. entries \.\.\. dependencies \.\.\. modules\n$/
				)
			);
			expect(logs).toContainEqual(
				expect.stringMatching(/\[webpack\.Progress\] \d+ ms building\n$/)
			);
			expect(logs).toContainEqual(
				expect.stringMatching(
					/\[webpack\.Progress\] {2}| \d+ ms sealing > module ids\n$/
				)
			);
			expect(logs).toContainEqual(
				expect.stringMatching(/\[webpack\.Progress\] \d+ ms sealing\n$/)
			);
		});
	});

	const monotonicTest = createCompiler => () => {
		const handlerCalls = [];
		const compiler = createCompiler({
			handler: (p, ...args) => {
				handlerCalls.push({ value: p, text: `${p}% ${args.join(" ")}` });
			}
		});

		return RunCompilerAsync(compiler).then(() => {
			let lastLine = handlerCalls[0];
			for (const line of handlerCalls) {
				if (line.value < lastLine.value) {
					throw new Error(
						`Progress value is not monotonic increasing:\n${lastLine.text}\n${line.text}`
					);
				}
				lastLine = line;
			}
		});
	};

	it(
		"should have monotonic increasing progress",
		monotonicTest(createSimpleCompiler)
	);
	it(
		"should have monotonic increasing progress (multi compiler)",
		monotonicTest(createMultiCompiler)
	);
	it(
		"should have monotonic increasing progress (multi compiler, parallelism)",
		monotonicTest(o => createMultiCompiler(o, { parallelism: 1 }))
	);

	it("should not print lines longer than stderr.columns", () => {
		const compiler = createSimpleCompiler();
		process.stderr.columns = 36;

		return RunCompilerAsync(compiler).then(() => {
			const logs = getLogs(stderr.toString());

			expect(logs.length).toBeGreaterThan(20);
			logs.forEach(log => expect(log.length).toBeLessThanOrEqual(35));
			expect(logs).toContain(
				"75% sealing ...mization ...nsPlugin",
				"trims each detail string equally"
			);
			expect(logs).toContain("92% sealing asset processing");
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

	it("should contain the new compiler hooks", () => {
		const compiler = createSimpleCompiler();

		process.stderr.columns = undefined;
		return RunCompilerAsync(compiler).then(() => {
			const logs = getLogs(stderr.toString());

			expect(logs).toContain("4% setup normal module factory");
			expect(logs).toContain("5% setup context module factory");
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

	it("should get the custom handler text from the log", () => {
		const compiler = createSimpleCompilerWithCustomHandler();

		return RunCompilerAsync(compiler).then(() => {
			const logs = stderr.toString();
			expect(logs).toEqual(
				expect.stringMatching(/\d+\/\d+ [custom test logger]/)
			);
			expect(logs).toEqual(expect.stringMatching(/\d+ active/));
			expect(logs).toEqual(expect.stringMatching(/\d+\/\d+ modules/));
		});
	});
});
