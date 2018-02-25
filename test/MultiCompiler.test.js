"use strict";

/* globals describe it */
const path = require("path");
const should = require("should");
const MemoryFs = require("memory-fs");
const webpack = require("../");

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

describe("MultiCompiler", function() {
	it("should trigger 'run' for each child compiler", done => {
		const compiler = createMultiCompiler();
		let called = 0;

		compiler.hooks.run.tap("MultiCompiler test", () => called++);
		compiler.run(err => {
			if (err) {
				throw err;
			} else {
				should(called).be.equal(2);
				done();
			}
		});
	});

	it("should trigger 'watchRun' for each child compiler", done => {
		const compiler = createMultiCompiler();
		let called = 0;

		compiler.hooks.watchRun.tap("MultiCompiler test", () => called++);
		const watcher = compiler.watch(1000, err => {
			if (err) {
				throw err;
			} else {
				watcher.close();
				should(called).be.equal(2);
				done();
			}
		});
	});
});
