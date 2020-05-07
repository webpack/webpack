"use strict";

const path = require("path");
const { createFsFromVolume, Volume } = require("memfs");
const webpack = require("..");

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
	compiler.outputFileSystem = createFsFromVolume(new Volume());
	compiler.watchFileSystem = {
		watch(a, b, c, d, e, f, g) {}
	};
	return compiler;
};

describe("MultiCompiler", function () {
	jest.setTimeout(20000);

	it("should trigger 'run' for each child compiler", done => {
		const compiler = createMultiCompiler();
		let called = 0;

		compiler.hooks.run.tap("MultiCompiler test", () => called++);
		compiler.run(err => {
			if (err) {
				throw err;
			}
			expect(called).toBe(2);
			done();
		});
	});

	it("should trigger 'watchRun' for each child compiler", done => {
		const compiler = createMultiCompiler();
		let called = 0;

		compiler.hooks.watchRun.tap("MultiCompiler test", () => called++);
		const watcher = compiler.watch(1000, err => {
			if (err) {
				throw err;
			}
			watcher.close();
			expect(called).toBe(2);
			done();
		});
	});

	it("should not be running twice at a time (run)", done => {
		const compiler = createMultiCompiler();
		compiler.run((err, stats) => {
			if (err) return done(err);
		});
		compiler.run((err, stats) => {
			if (err) return done();
		});
	});
	it("should not be running twice at a time (watch)", done => {
		const compiler = createMultiCompiler();
		const watcher = compiler.watch({}, (err, stats) => {
			if (err) return done(err);
		});
		compiler.watch({}, (err, stats) => {
			if (err) return watcher.close(done);
		});
	});
	it("should not be running twice at a time (run - watch)", done => {
		const compiler = createMultiCompiler();
		compiler.run((err, stats) => {
			if (err) return done(err);
		});
		compiler.watch({}, (err, stats) => {
			if (err) return done();
		});
	});
	it("should not be running twice at a time (watch - run)", done => {
		const compiler = createMultiCompiler();
		let watcher;
		watcher = compiler.watch({}, (err, stats) => {
			if (err) return done(err);
		});
		compiler.run((err, stats) => {
			if (err) return watcher.close(done);
		});
	});
	it("should not be running twice at a time (instance cb)", done => {
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
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		compiler.run((err, stats) => {
			if (err) return done();
		});
	});
	it("should run again correctly after first compilation", done => {
		const compiler = createMultiCompiler();
		compiler.run((err, stats) => {
			if (err) return done(err);

			compiler.run((err, stats) => {
				if (err) return done(err);
				done();
			});
		});
	});
	it("should watch again correctly after first compilation", done => {
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
	it("should run again correctly after first closed watch", done => {
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
	it("should watch again correctly after first closed watch", done => {
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
});
