"use strict";

const path = require("node:path");
const { Volume, createFsFromVolume } = require("memfs");
const webpack = require("..");
const expectNoDeprecations = require("./helpers/expectNoDeprecations");

/**
 * @param {import("../").Configuration | import("../").MultiConfiguration} config webpack config
 * @returns {import("../").Compiler | import("../").MultiCompiler} compiler instance
 */
const createCompiler = (config) => {
	const compiler =
		/** @type {import("../").Compiler | import("../").MultiCompiler} */ (
			webpack(
				/** @type {import("../").Configuration} */ (
					/** @type {unknown} */ (config)
				)
			)
		);
	/** @type {import("../").Compiler} */ (compiler).outputFileSystem =
		/** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
	return compiler;
};

const createSingleCompiler = () =>
	createCompiler({
		context: path.join(__dirname, "fixtures"),
		entry: "./a.js"
	});

const createMultiCompiler = () =>
	createCompiler([
		{
			context: path.join(__dirname, "fixtures"),
			entry: "./a.js"
		}
	]);

expectNoDeprecations();

describe("WatcherEvents", () => {
	if (process.env.NO_WATCH_TESTS) {
		// eslint-disable-next-line jest/no-disabled-tests
		it.skip("long running tests excluded", () => {});

		return;
	}

	it("should emit 'watch-close' when using single-compiler mode and the compiler is not running", (done) => {
		let called = false;

		const compiler = createSingleCompiler();
		const watcher = /** @type {import("../").Compiler} */ (compiler).watch(
			{},
			(err, _stats) => {
				expect(called).toBe(true);
				done(err);
			}
		);

		compiler.hooks.watchClose.tap("WatcherEventsTest", () => {
			called = true;
		});

		compiler.hooks.done.tap("WatcherEventsTest", () => {
			/** @type {{ close: () => void }} */ (
				/** @type {unknown} */ (watcher)
			).close();
		});
	});

	it("should emit 'watch-close' when using multi-compiler mode and the compiler is not running", (done) => {
		let called = false;

		const compiler = createMultiCompiler();
		const watcher = /** @type {import("../").MultiCompiler} */ (compiler).watch(
			{},
			(err, _stats) => {
				expect(called).toBe(true);
				done(err);
			}
		);

		compiler.hooks.watchClose.tap("WatcherEventsTest", () => {
			called = true;
		});

		compiler.hooks.done.tap("WatcherEventsTest", () => {
			/** @type {{ close: () => void }} */ (
				/** @type {unknown} */ (watcher)
			).close();
		});
	});
});
