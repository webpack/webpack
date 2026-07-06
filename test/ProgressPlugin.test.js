"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const _ = require("lodash");
const { Volume, createFsFromVolume } = require("memfs");
const webpack = require("..");
const captureStdio = require("./helpers/captureStdio");
const expectNoDeprecations = require("./helpers/expectNoDeprecations");

const createMultiCompiler = (
	/** @type {Record<string, unknown> | undefined} */ progressOptions = undefined,
	/** @type {Record<string, unknown> | undefined} */ configOptions = undefined
) => {
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
	compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
		/** @type {unknown} */ (createFsFromVolume(new Volume()))
	);

	new webpack.ProgressPlugin(progressOptions).apply(compiler);

	return compiler;
};

const createSimpleCompiler = (
	/** @type {Record<string, unknown> | undefined} */ progressOptions = undefined
) => {
	const compiler = webpack({
		context: path.join(__dirname, "fixtures"),
		entry: "./a.js",
		infrastructureLogging: {
			debug: /Progress/
		},
		plugins: [
			new webpack.ProgressPlugin({
				activeModules: true,
				...progressOptions
			})
		]
	});

	compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
		/** @type {unknown} */ (createFsFromVolume(new Volume()))
	);

	return compiler;
};

const createSimpleCompilerWithCustomHandler = (
	/** @type {Record<string, unknown> | undefined} */ options = undefined
) => {
	const compiler = webpack({
		context: path.join(__dirname, "fixtures"),
		entry: "./a.js"
	});

	compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
		/** @type {unknown} */ (createFsFromVolume(new Volume()))
	);
	const logger = compiler.getInfrastructureLogger("custom test logger");
	new webpack.ProgressPlugin({
		activeModules: true,
		...options,
		handler: (...args) => logger.status(args)
	}).apply(compiler);

	return compiler;
};

const createAutoCompiler = (
	/** @type {Record<string, unknown> | undefined} */ progressOptions,
	/** @type {{ infrastructureLogging?: Record<string, unknown>, experiments?: Record<string, unknown> }} */ extra = {}
) => {
	const compiler = webpack({
		context: path.join(__dirname, "fixtures"),
		entry: "./a.js",
		experiments: extra.experiments,
		infrastructureLogging: {
			debug: /Progress/,
			colors: false,
			...extra.infrastructureLogging
		},
		plugins: [new webpack.ProgressPlugin(progressOptions)]
	});

	compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
		/** @type {unknown} */ (createFsFromVolume(new Volume()))
	);

	return compiler;
};

const getLogs = (/** @type {string} */ logsStr) =>
	logsStr.split(/\r/).filter((/** @type {string} */ v) => v !== " ");

const runCompilerAsync = (
	/** @type {import("../").Compiler | import("../").MultiCompiler} */ compiler
) =>
	new Promise((resolve, reject) => {
		compiler.run((/** @type {Error | null} */ err) => {
			if (err) {
				reject(err);
			} else {
				resolve(undefined);
			}
		});
	});

/** @typedef {{ toString(): string, toStringRaw(): string, restore(): void, data: string[], reset(): void }} CapturedStdio */

expectNoDeprecations();

describe("ProgressPlugin", () => {
	/** @type {CapturedStdio} */
	let stderr;
	/** @type {CapturedStdio} */
	let stdout;

	beforeEach(() => {
		stderr = captureStdio(process.stderr, true);
		stdout = captureStdio(process.stdout, true);
	});

	afterEach(() => {
		// eslint-disable-next-line no-unused-expressions
		stderr && stderr.restore();
		// eslint-disable-next-line no-unused-expressions
		stdout && stdout.restore();
	});

	const nanTest =
		(/** @type {(...args: EXPECTED_ANY[]) => EXPECTED_ANY} */ createCompiler) =>
		() => {
			const compiler = createCompiler();

			return runCompilerAsync(compiler).then(() => {
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
		"should not contain NaN as a percentage when it is applied to MultiCompiler (parallelism: 1)",
		nanTest(() => createMultiCompiler(undefined, { parallelism: 1 }))
	);

	it("should start print only on call run/watch", (done) => {
		const compiler = createSimpleCompiler();

		const logs = getLogs(stderr.toString());
		expect(logs.join("")).toHaveLength(0);

		compiler.close(done);
	});

	it("should print profile information", () => {
		const compiler = createSimpleCompiler({
			profile: true
		});

		return runCompilerAsync(compiler).then(() => {
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

	const monotonicTest =
		(/** @type {(...args: EXPECTED_ANY[]) => EXPECTED_ANY} */ createCompiler) =>
		() => {
			/** @type {{ value: number, text: string }[]} */
			const handlerCalls = [];
			const compiler = createCompiler({
				handler: (/** @type {number} */ p, /** @type {string[]} */ ...args) => {
					handlerCalls.push({ value: p, text: `${p}% ${args.join(" ")}` });
				}
			});

			return runCompilerAsync(compiler).then(() => {
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
		monotonicTest((/** @type {Record<string, unknown>} */ o) =>
			createMultiCompiler(o, { parallelism: 1 })
		)
	);

	it("should not print lines longer than stderr.columns", () => {
		const compiler = createSimpleCompiler();
		process.stderr.columns = 36;

		return runCompilerAsync(compiler).then(() => {
			const logs = getLogs(stderr.toString());

			expect(logs.length).toBeGreaterThan(20);
			for (const log of logs) {
				expect(log.length).toBeLessThanOrEqual(35);
			}
			// cspell:ignore mization nsPlugin
			/** @type {EXPECTED_ANY} */ (expect(logs)).toContain(
				"75% sealing ...mization ...nsPlugin",
				"trims each detail string equally"
			);
			expect(logs).toContain("92% sealing asset processing");
			expect(logs).toContain("100%");
		});
	});

	it("should handle when stderr.columns is undefined", () => {
		const compiler = createSimpleCompiler();

		/** @type {EXPECTED_ANY} */ (process.stderr).columns = undefined;
		return runCompilerAsync(compiler).then(() => {
			const logs = getLogs(stderr.toString());

			expect(logs.length).toBeGreaterThan(20);
			expect(
				/** @type {string} */ (_.maxBy(logs, "length")).length
			).not.toBeGreaterThan(40);
		});
	});

	it("should contain the new compiler hooks", () => {
		const compiler = createSimpleCompiler();

		/** @type {EXPECTED_ANY} */ (process.stderr).columns = undefined;
		return runCompilerAsync(compiler).then(() => {
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

		process.stderr.columns = 70;
		return runCompilerAsync(compiler).then(() => {
			const logs = stderr.toString();

			expect(logs).toEqual(expect.stringMatching(/\d+\/\d+ entries/));
			expect(logs).toEqual(expect.stringMatching(/\d+\/\d+ dependencies/));
			expect(logs).toEqual(expect.stringMatching(/\d+\/\d+ modules/));
			expect(logs).toEqual(expect.stringMatching(/\d+ active/));
		});
	});

	it("should respect falsy boolean options", () => {
		const plugin = new webpack.ProgressPlugin({
			modules: false,
			dependencies: false,
			entries: false,
			activeModules: false,
			profile: false
		});

		expect(plugin.showModules).toBe(false);
		expect(plugin.showDependencies).toBe(false);
		expect(plugin.showEntries).toBe(false);
		expect(plugin.showActiveModules).toBe(false);
		expect(plugin.profile).toBe(false);
	});

	it("should normalize progressBar option", () => {
		expect(new webpack.ProgressPlugin({}).progressBar).toBe(false);
		expect(new webpack.ProgressPlugin({ progressBar: false }).progressBar).toBe(
			false
		);
		expect(
			new webpack.ProgressPlugin({ progressBar: true }).progressBar
		).toEqual({ name: "Build", color: "green", width: 25 });
		expect(
			new webpack.ProgressPlugin({ progressBar: { name: "Custom" } })
				.progressBar
		).toEqual({ name: "Custom", color: "green", width: 25 });
		expect(
			new webpack.ProgressPlugin({ progressBar: { color: "red" } }).progressBar
		).toEqual({ name: "Build", color: "red", width: 25 });
		expect(
			new webpack.ProgressPlugin({
				progressBar: { name: "Custom", color: "cyan", width: 10 }
			}).progressBar
		).toEqual({ name: "Custom", color: "cyan", width: 10 });
		expect(
			new webpack.ProgressPlugin({ progressBar: "auto" }).progressBar
		).toBe("auto");
	});

	it("should render progress bar with block characters when enabled", () => {
		const compiler = createSimpleCompiler({
			progressBar: { name: "TestBar", color: "magenta" }
		});

		process.stderr.columns = 70;
		return runCompilerAsync(compiler).then(() => {
			const logs = stderr.toString();
			expect(logs).toContain("━");
			expect(logs).toContain("●");
			expect(logs).toContain("TestBar");
			expect(logs).toEqual(expect.stringMatching(/\(\d+%\)/));
		});
	});

	it("should render progress bar when applied to MultiCompiler", () => {
		const compiler = createMultiCompiler({
			progressBar: { name: "MultiBar", color: "cyan" }
		});

		process.stderr.columns = 200;
		return runCompilerAsync(compiler).then(() => {
			const logs = stderr.toString();

			expect(logs).toContain("━");
			expect(logs).toContain("●");
			expect(logs).toContain("MultiBar");
			expect(logs).toEqual(expect.stringMatching(/\(\d+%\)/));
		});
	});

	it("should render progress bars for two parallel compilers", () => {
		const compilerA = createSimpleCompiler({
			progressBar: { name: "BarA", color: "red" }
		});
		const compilerB = createSimpleCompiler({
			progressBar: { name: "BarB", color: "blue" }
		});

		process.stderr.columns = 70;
		return Promise.all([
			runCompilerAsync(compilerA),
			runCompilerAsync(compilerB)
		]).then(() => {
			const logs = stderr.toString();
			expect(logs).toContain("BarA");
			expect(logs).toContain("BarB");
			expect(logs).toContain("━");
			expect(logs).toContain("●");
		});
	});

	it("should respect the progressBar width", () => {
		const compiler = createSimpleCompiler({
			progressBar: { name: "WideBar", color: "green", width: 10 }
		});

		process.stderr.columns = 200;
		return runCompilerAsync(compiler).then(() => {
			const logs = stderr.toString();
			// At 100% the bar is fully filled, so it never exceeds the configured width.
			expect(logs).toContain("━".repeat(10));
			expect(logs).not.toContain("━".repeat(11));
		});
	});

	it("should not render the bar for progressBar: 'auto' in non-interactive output", () => {
		const compiler = createAutoCompiler(
			{ progressBar: "auto" },
			{ infrastructureLogging: { appendOnly: true } }
		);

		process.stderr.columns = 120;
		return runCompilerAsync(compiler).then(() => {
			const logs = stderr.toString();
			expect(logs).not.toContain("━");
			expect(logs).toEqual(expect.stringMatching(/\d+%/));
		});
	});

	it("should render the bar for progressBar: 'auto' in interactive output", () => {
		const compiler = createAutoCompiler(
			{ progressBar: "auto" },
			{ infrastructureLogging: { appendOnly: false } }
		);

		process.stderr.columns = 120;
		return runCompilerAsync(compiler).then(() => {
			expect(stderr.toString()).toContain("━");
		});
	});

	it("should enable the auto bar by default with experiments.futureDefaults (interactive)", () => {
		const compiler = createAutoCompiler(
			{},
			{
				infrastructureLogging: { appendOnly: false },
				experiments: { futureDefaults: true }
			}
		);

		process.stderr.columns = 120;
		return runCompilerAsync(compiler).then(() => {
			expect(stderr.toString()).toContain("━");
		});
	});

	it("should respect an explicit progressBar: false even with futureDefaults", () => {
		const compiler = createAutoCompiler(
			{ progressBar: false },
			{
				infrastructureLogging: { appendOnly: false },
				experiments: { futureDefaults: true }
			}
		);

		process.stderr.columns = 120;
		return runCompilerAsync(compiler).then(() => {
			expect(stderr.toString()).not.toContain("━");
		});
	});

	it("should display estimated time when estimatedTime is enabled", () => {
		const compiler = createSimpleCompiler({ estimatedTime: true });

		process.stderr.columns = 120;
		return runCompilerAsync(compiler).then(() => {
			const logs = stderr.toString();
			expect(logs).toEqual(expect.stringMatching(/ETA: \d+(?:ms|s|m)/));
			expect(logs).not.toContain("NaN");
		});
	});

	it("should display phase timings when phaseTimings is enabled", () => {
		const compiler = createSimpleCompiler({ phaseTimings: true });

		process.stderr.columns = 120;
		return runCompilerAsync(compiler).then(() => {
			const logs = stderr.toString();
			expect(logs).toEqual(
				expect.stringMatching(/Build completed in \d+(?:ms|s|m)/)
			);
			expect(logs).toContain("Phase breakdown:");
			// The summary is printed exactly once per build.
			expect(logs.match(/Build completed in/g)).toHaveLength(1);
		});
	});

	it("should accept estimatedTime and phaseTimings together without errors", () => {
		const compiler = createSimpleCompiler({
			progressBar: true,
			estimatedTime: true,
			phaseTimings: true
		});

		process.stderr.columns = 150;
		return runCompilerAsync(compiler).then(() => {
			const logs = stderr.toString();
			expect(logs).toContain("%");
			expect(logs).not.toContain("NaN");
		});
	});

	it("should get the custom handler text from the log", () => {
		const compiler = createSimpleCompilerWithCustomHandler();

		process.stderr.columns = 70;
		return runCompilerAsync(compiler).then(() => {
			const logs = stderr.toString();
			expect(logs).toEqual(
				expect.stringMatching(/\d+\/\d+ [custom test logger]/)
			);
			expect(logs).toEqual(expect.stringMatching(/\d+ active/));
			expect(logs).toEqual(expect.stringMatching(/\d+\/\d+ modules/));
		});
	});
});
