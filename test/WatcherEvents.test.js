"use strict";

const path = require("path");
const MemoryFs = require("memory-fs");
const webpack = require("../");

const createCompiler = config => {
	const compiler = webpack(config);
	compiler.outputFileSystem = new MemoryFs();
	return compiler;
};

const createSingleCompiler = () => {
	return createCompiler({
		context: path.join(__dirname, "fixtures"),
		entry: "./a.js"
	});
};

const createMultiCompiler = () => {
	return createCompiler([{
		context: path.join(__dirname, "fixtures"),
		entry: "./a.js"
	}]);
};

describe("WatchEvents", () => {

	it("should emit 'watch-close' when using single-compiler mode and the compiler is not running", function(done) {
		let called = false;

		const compiler = createSingleCompiler();
		const watcher = compiler.watch({}, (err, stats) => {
			expect(called).toBe(true);
			done(err);
		});

		compiler.plugin('watch-close', () => {
			called = true
		});

		compiler.plugin('done', () => {
			watcher.close();
		});

	});

	it("should emit 'watch-close' when using multi-compiler mode and the compiler is not running", function(done) {
		let called = false;

		const compiler = createMultiCompiler();
		const watcher = compiler.watch({}, (err, stats) => {
			expect(called).toBe(true);
			done(err);
		});

		compiler.plugin('watch-close', () => {
			called = true
		});

		compiler.plugin('done', () => {
			watcher.close();
		});

	});

});
