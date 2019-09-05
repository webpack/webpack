"use strict";

/* globals describe it */
const path = require("path");
const MemoryFs = require("memory-fs");
const webpack = require("../");
const largeCompilationMultiConfig = require("./fixtures/large-compilation/webpack-dependency/multi.webpack.config");

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
	jest.setTimeout(20000);

	it("should trigger 'run' for each child compiler", done => {
		const compiler = createMultiCompiler();
		let called = 0;

		compiler.hooks.run.tap("MultiCompiler test", () => called++);
		compiler.run(err => {
			if (err) {
				throw err;
			} else {
				expect(called).toBe(2);
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
				expect(called).toBe(2);
				done();
			}
		});
	});

	it("should not be run twice at a time (run)", function(done) {
		const compiler = createMultiCompiler();
		compiler.run((err, stats) => {
			if (err) return done(err);
		});
		compiler.run((err, stats) => {
			if (err) return done();
		});
	});
	it("should not be run twice at a time (watch)", function(done) {
		const compiler = createMultiCompiler();
		const watcher = compiler.watch({}, (err, stats) => {
			if (err) return done(err);
		});
		compiler.watch({}, (err, stats) => {
			if (err) return watcher.close(done);
		});
	});
	it("should not be run twice at a time (run - watch)", function(done) {
		const compiler = createMultiCompiler();
		compiler.run((err, stats) => {
			if (err) return done(err);
		});
		compiler.watch({}, (err, stats) => {
			if (err) return done();
		});
	});
	it("should not be run twice at a time (watch - run)", function(done) {
		const compiler = createMultiCompiler();
		let watcher;
		watcher = compiler.watch({}, (err, stats) => {
			if (err) return done(err);
		});
		compiler.run((err, stats) => {
			if (err) return watcher.close(done);
		});
	});
	it("should not be run twice at a time (instance cb)", function(done) {
		const compiler = webpack(
			{
				context: __dirname,
				mode: "production",
				entry: "./c",
				output: {
					path: "/",
					filename: "bundle.js"
				}
			},
			() => {}
		);
		compiler.outputFileSystem = new MemoryFs();
		compiler.run((err, stats) => {
			if (err) return done();
		});
	});
	it("should run again correctly after first compilation", function(done) {
		const compiler = createMultiCompiler();
		compiler.run((err, stats) => {
			if (err) return done(err);

			compiler.run((err, stats) => {
				if (err) return done(err);
				done();
			});
		});
	});
	it("should watch again correctly after first compilation", function(done) {
		const compiler = createMultiCompiler();
		compiler.run((err, stats) => {
			if (err) return done(err);

			let watcher;
			watcher = compiler.watch({}, (err, stats) => {
				if (err) return done(err);
				watcher.close(done);
			});
		});
	});
	it("should run again correctly after first closed watch", function(done) {
		const compiler = createMultiCompiler();
		const watching = compiler.watch({}, (err, stats) => {
			if (err) return done(err);
		});
		watching.close(() => {
			compiler.run((err, stats) => {
				if (err) return done(err);
				done();
			});
		});
	});
	it("should watch again correctly after first closed watch", function(done) {
		const compiler = createMultiCompiler();
		const watching = compiler.watch({}, (err, stats) => {
			if (err) return done(err);
		});
		watching.close(() => {
			let watcher;
			watcher = compiler.watch({}, (err, stats) => {
				if (err) return done(err);
				watcher.close(done);
			});
		});
	});

	describe("compiler.endCompilationEarly", () => {
		it("should end a long compilation (compile)", done => {
			const compiler = webpack(largeCompilationMultiConfig);
			compiler.outputFileSystem = new MemoryFs();
			setTimeout(() => {
				compiler.endCompilationEarly();
			}, 1000);
			compiler.run((err, stats) => {
				if (err) return done(err);
				if (compiler.compilers[0].outputFileSystem.existsSync("/bundle.js"))
					return done(
						new Error("Bundle should not be created on killed compilation")
					);
				// the other bundle in this multi compilation should exist, because
				// it is a small compilation and should finish compiling quickly
				expect(
					compiler.compilers[1].outputFileSystem.existsSync("/bundle2.js")
				).toBeTruthy();
				done();
			});
		});

		it("should end a long compilation (watch)", done => {
			const compiler = webpack(largeCompilationMultiConfig);
			compiler.outputFileSystem = new MemoryFs();
			setTimeout(() => {
				compiler.endCompilationEarly();
			}, 1000);
			const watcher = compiler.watch({}, (err, stats) => {
				watcher.close();

				if (err) return done(err);
				if (compiler.compilers[0].outputFileSystem.existsSync("/bundle.js"))
					return done(
						new Error("Bundle should not be created on killed compilation")
					);
				// the other bundle in this multi compilation should exist, because
				// it is a small compilation and should finish compiling quickly
				expect(
					compiler.compilers[1].outputFileSystem.existsSync("/bundle2.js")
				).toBeTruthy();
				done();
			});
		});
	});

	describe("watcher.kill", () => {
		it("should end a long compilation", done => {
			const compiler = webpack(largeCompilationMultiConfig);
			compiler.outputFileSystem = new MemoryFs();
			const cb = jest.fn();
			setTimeout(() => {
				watcher.kill(() => {
					// the watcher callback should not be called because the
					// compilation is stopped, not completed
					expect(cb).not.toHaveBeenCalled();
					done();
				});
			}, 1000);
			const watcher = compiler.watch({}, cb);
		});
	});
});
