"use strict";

const path = require("path");
const { createFsFromVolume, Volume } = require("memfs");
const webpack = require("..");

const createCompiler = config => {
	const compiler = webpack(config);
	compiler.outputFileSystem = createFsFromVolume(new Volume());
	return compiler;
};

const createSingleCompiler = () => {
	return createCompiler({
		context: path.join(__dirname, "fixtures"),
		entry: "./a.js"
	});
};

const createMultiCompiler = () => {
	return createCompiler([
		{
			context: path.join(__dirname, "fixtures"),
			entry: "./a.js"
		}
	]);
};

describe("WatcherEvents", () => {
	if (process.env.NO_WATCH_TESTS) {
		it.skip("long running tests excluded", () => {});
		return;
	}

	jest.setTimeout(10000);

	it("should emit 'watch-close' when using single-compiler mode and the compiler is not running", done => {
		let called = false;

		const compiler = createSingleCompiler();
		const watcher = compiler.watch({}, (err, stats) => {
			expect(called).toBe(true);
			done(err);
		});

		compiler.hooks.watchClose.tap("WatcherEventsTest", () => {
			called = true;
		});

		compiler.hooks.done.tap("WatcherEventsTest", () => {
			watcher.close();
		});
	});

	it("should emit 'watch-close' when using multi-compiler mode and the compiler is not running", done => {
		let called = false;

		const compiler = createMultiCompiler();
		const watcher = compiler.watch({}, (err, stats) => {
			expect(called).toBe(true);
			done(err);
		});

		compiler.hooks.watchClose.tap("WatcherEventsTest", () => {
			called = true;
		});

		compiler.hooks.done.tap("WatcherEventsTest", () => {
			watcher.close();
		});
	});
});
