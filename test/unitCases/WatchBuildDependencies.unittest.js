"use strict";

require("../helpers/warmup-webpack");

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");

const testDirectory = path.resolve(__dirname, "..");

/**
 * @param {number} ms milliseconds
 * @returns {Promise<void>} resolves after the delay
 */
const wait = (ms) =>
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

describe("WatchBuildDependencies", () => {
	if (process.env.NO_WATCH_TESTS) {
		// eslint-disable-next-line jest/no-disabled-tests
		it.skip("long running tests excluded", () => {});

		return;
	}

	/** @type {string} */
	let fixturePath;
	/** @type {string} */
	let entryPath;
	/** @type {string} */
	let configPath;

	beforeEach(() => {
		fixturePath = path.join(
			testDirectory,
			"fixtures",
			`temp-watch-build-dependencies-${Date.now()}`
		);
		entryPath = path.join(fixturePath, "index.js");
		configPath = path.join(fixturePath, "config.json");
		fs.mkdirSync(fixturePath, { recursive: true });
		fs.writeFileSync(entryPath, "'entry'", "utf8");
		fs.writeFileSync(configPath, '{ "value": 1 }', "utf8");
	});

	afterEach((done) => {
		rimraf(fixturePath, done);
	});

	/**
	 * @param {Partial<import("../../").Configuration>} options extra options
	 * @returns {import("../../").Compiler} compiler
	 */
	const createCompiler = (options = {}) => {
		const webpack = require("../../");

		return webpack({
			mode: "development",
			context: fixturePath,
			entry: entryPath,
			output: {
				path: path.join(testDirectory, "js/WatchBuildDependencies"),
				filename: "bundle.js"
			},
			buildDependencies: { config: [configPath] },
			...options
		});
	};

	it("should report changed build dependencies and keep the watching suspended", async () => {
		const compiler = createCompiler();
		/** @type {ReadonlySet<string>[]} */
		const reported = [];
		let builds = 0;

		compiler.hooks.buildDependenciesChanged.tap("Test", (changedFiles) => {
			reported.push(changedFiles);
			return true;
		});

		const watching = /** @type {import("../../").Watching} */ (
			compiler.watch({ aggregateTimeout: 50 }, (err) => {
			if (err) throw err;
			builds++;
		})
		);

		try {
			while (builds === 0) await wait(50);
			expect(new Set(/** @type {Map<string, number | null | undefined>} */ (compiler.buildDependencyFiles).keys())).toEqual(
				new Set([configPath]));

			fs.writeFileSync(configPath, '{ "value": 2 }', "utf8");
			while (reported.length === 0) await wait(50);

			expect(reported).toEqual([new Set([configPath])]);
			expect(watching.suspended).toBe(true);

			// no rebuild while suspended, even for normal file changes
			fs.writeFileSync(entryPath, "'changed'", "utf8");
			await wait(500);
			expect(builds).toBe(1);

			watching.resume();
			while (builds === 1) await wait(50);
			expect(builds).toBe(2);
		} finally {
			await new Promise((resolve) => {
				watching.close(resolve);
			});
		}
	});

	it("should warn without rebuilding when nobody handles changed build dependencies", async () => {
		/** @type {string[]} */
		const warnings = [];
		const compiler = createCompiler({
			infrastructureLogging: {
				level: "warn",
				console: /** @type {Console} */ (
					/** @type {unknown} */ ({
						warn: (/** @type {string} */ message) => warnings.push(message)
					})
				)
			}
		});
		let builds = 0;

		const watching = /** @type {import("../../").Watching} */ (
			compiler.watch({ aggregateTimeout: 50 }, (err) => {
				if (err) throw err;
				builds++;
			})
		);

		try {
			while (builds === 0) await wait(50);

			// files written just before the start may cause one more build
			await wait(500);
			const settledBuilds = builds;

			fs.writeFileSync(configPath, '{ "value": 2 }', "utf8");
			while (warnings.length === 0) await wait(50);
			await wait(300);

			// the configuration isn't part of the build, nothing to rebuild with it unchanged
			expect(builds).toBe(settledBuilds);
			expect(watching.suspended).toBe(false);
			expect(warnings).toEqual([
				expect.stringContaining("Build dependencies changed")
			]);

			// still watching the build's own files
			fs.writeFileSync(entryPath, "'changed'", "utf8");
			while (builds === settledBuilds) await wait(50);
		} finally {
			await new Promise((resolve) => {
				watching.close(resolve);
			});
		}
	});

	it("should resume without rebuilding when only build dependencies changed", async () => {
		const compiler = createCompiler();
		/** @type {ReadonlySet<string>[]} */
		const reported = [];
		let builds = 0;

		compiler.hooks.buildDependenciesChanged.tap("Test", (changedFiles) => {
			reported.push(changedFiles);
			return true;
		});

		const watching = /** @type {import("../../").Watching} */ (
			compiler.watch({ aggregateTimeout: 50 }, (err) => {
				if (err) throw err;
				builds++;
			})
		);

		try {
			while (builds === 0) await wait(50);
			// files written just before the start may cause one more build
			await wait(500);
			const settledBuilds = builds;

			fs.writeFileSync(configPath, '{ "value": 2 }', "utf8");
			while (reported.length === 0) await wait(50);

			// e.g. the new configuration failed to load, the old build goes on
			watching.resume();
			await wait(500);
			expect(builds).toBe(settledBuilds);

			// the build dependencies are watched again
			fs.writeFileSync(configPath, '{ "value": 3 }', "utf8");
			while (reported.length === 1) await wait(50);
			expect(reported).toEqual([
				new Set([configPath]),
				new Set([configPath])
			]);
			expect(builds).toBe(settledBuilds);
		} finally {
			await new Promise((resolve) => {
				watching.close(resolve);
			});
		}
	});

	it("should ignore a build dependency reported changed without a new timestamp", async () => {
		/** @type {string[]} */
		const warnings = [];
		const compiler = createCompiler({
			infrastructureLogging: {
				level: "warn",
				console: /** @type {Console} */ (
					/** @type {unknown} */ ({
						warn: (/** @type {string} */ message) => warnings.push(message)
					})
				)
			}
		});
		/** @type {ReadonlySet<string>[]} */
		const reported = [];
		let builds = 0;
		compiler.hooks.buildDependenciesChanged.tap("Test", (changedFiles) => {
			reported.push(changedFiles);
			return true;
		});

		// The watcher reports files modified around the build's start as changed, do so on purpose
		const watchFileSystem =
			/** @type {import("../../lib/fs/fs").WatchFileSystem} */ (
				compiler.watchFileSystem
			);
		let injected = false;
		/** @type {import("../../lib/fs/fs").WatchFileSystem} */
		const injectingWatchFileSystem = {
			watch(files, dirs, missing, startTime, options, callback, undelayed) {
				const watcher = watchFileSystem.watch(
					files,
					dirs,
					missing,
					startTime,
					options,
					callback,
					undelayed
				);
				if (!injected) {
					injected = true;
					const timestamp = Number(fs.statSync(configPath).mtime);
					setTimeout(() => {
						watcher.pause();
						callback(
							null,
							new Map([[configPath, { safeTime: timestamp, timestamp }]]),
							new Map(),
							new Set([configPath]),
							new Set()
						);
					}, 100);
				}
				return watcher;
			}
		};
		compiler.watchFileSystem = injectingWatchFileSystem;

		const watching = /** @type {import("../../").Watching} */ (
			compiler.watch({ aggregateTimeout: 50 }, (err) => {
				if (err) throw err;
				builds++;
			})
		);

		try {
			while (!injected || builds === 0) await wait(50);
			await wait(500);
			const settledBuilds = builds;
			expect(reported).toEqual([]);
			expect(warnings).toEqual([]);
			expect(watching.suspended).toBe(false);

			// a real change is still reported
			fs.writeFileSync(configPath, '{ "value": 2 }', "utf8");
			while (reported.length === 0) await wait(50);
			expect(reported).toEqual([new Set([configPath])]);
			expect(builds).toBe(settledBuilds);
		} finally {
			await new Promise((resolve) => {
				watching.close(resolve);
			});
		}
	});

	it("should report a build dependency changed after the configuration was loaded", async () => {
		const compiler = createCompiler();
		/** @type {ReadonlySet<string>[]} */
		const reported = [];
		let builds = 0;

		compiler.hooks.buildDependenciesChanged.tap("Test", (changedFiles) => {
			reported.push(changedFiles);
			return true;
		});
		// changed after the configuration was loaded, before the build reads its timestamp
		let written = false;
		compiler.hooks.watchRun.tapAsync(
			{ name: "Test", stage: -100 },
			(_compiler, callback) => {
				if (written) return callback();
				written = true;
				setTimeout(() => {
					fs.writeFileSync(configPath, '{ "value": 2 }', "utf8");
					callback();
				}, 20);
			}
		);

		const watching = /** @type {import("../../").Watching} */ (
			compiler.watch({ aggregateTimeout: 50 }, (err) => {
				if (err) throw err;
				builds++;
			})
		);

		try {
			while (reported.length === 0) await wait(50);
			expect(reported).toEqual([new Set([configPath])]);
		} finally {
			await new Promise((resolve) => {
				watching.close(resolve);
			});
		}
	});

	it("should report changed build dependencies through the MultiCompiler hook", async () => {
		const webpack = require("../../");
		/** @type {(name: string) => import("../../").Configuration} */
		const createOptions = (name) => ({
			name,
			mode: "development",
			context: fixturePath,
			entry: entryPath,
			output: {
				path: path.join(testDirectory, "js/WatchBuildDependencies", name),
				filename: "bundle.js"
			},
			buildDependencies: { config: [configPath] }
		});
		const compiler = webpack([createOptions("a"), createOptions("b")]);
		/** @type {ReadonlySet<string>[]} */
		const reported = [];
		let builds = 0;

		compiler.hooks.buildDependenciesChanged.tap(
			"Test",
			(/** @type {ReadonlySet<string>} */ changedFiles) => {
				reported.push(changedFiles);
				return true;
			}
		);

		const watching = /** @type {NonNullable<ReturnType<import("../../").MultiCompiler["watch"]>>} */ (
			compiler.watch({ aggregateTimeout: 50 }, (err) => {
				if (err) throw err;
				builds++;
			})
		);

		try {
			while (builds === 0) await wait(50);

			fs.writeFileSync(configPath, '{ "value": 2 }', "utf8");
			// each child compiler reports its own change
			while (reported.length < 2) await wait(50);
			expect(reported).toEqual([new Set([configPath]), new Set([configPath])]);
			for (const child of compiler.compilers) {
				expect(
					/** @type {import("../../").Watching} */ (child.watching).suspended
				).toBe(true);
			}
		} finally {
			await new Promise((resolve) => {
				watching.close(resolve);
			});
		}
	});

	it("should not watch build dependencies when disabled", async () => {
		const compiler = createCompiler({
			watchOptions: { buildDependencies: false }
		});
		let builds = 0;

		const watching = /** @type {import("../../").Watching} */ (
			compiler.watch({ aggregateTimeout: 50 }, (err) => {
			if (err) throw err;
			builds++;
		})
		);

		try {
			while (builds === 0) await wait(50);
			expect(compiler.buildDependencyFiles).toBeUndefined();
		} finally {
			await new Promise((resolve) => {
				watching.close(resolve);
			});
		}
	});

	// Following imports of a `.ts` file needs Node.js type stripping
	const itWithTypeStripping =
		"stripTypeScriptTypes" in require("module") ? it : it.skip;

	itWithTypeStripping(
		"should watch what a TypeScript build dependency imports",
		async () => {
			const tsConfigPath = path.join(fixturePath, "config.ts");
			const helperPath = path.join(fixturePath, "helper.ts");

			fs.writeFileSync(
				tsConfigPath,
				'import { value } from "./helper.ts";\nexport default { value } as { value: number };\n',
				"utf8"
			);
			fs.writeFileSync(
				helperPath,
				"export const value: number = 1;\n",
				"utf8"
			);

			const compiler = createCompiler({
				buildDependencies: { config: [tsConfigPath] }
			});
			let builds = 0;

			const watching = /** @type {import("../../").Watching} */ (
				compiler.watch({ aggregateTimeout: 50 }, (err) => {
					if (err) throw err;
					builds++;
				})
			);

			try {
				while (builds === 0) await wait(50);
				expect(new Set(/** @type {Map<string, number | null | undefined>} */ (compiler.buildDependencyFiles).keys())).toEqual(
				new Set([tsConfigPath, helperPath])
				);
			} finally {
				await new Promise((resolve) => {
					watching.close(resolve);
				});
			}
		}
	);
});
