"use strict";

const path = require("path");
const { createFsFromVolume, Volume } = require("memfs");
const webpack = require("..");

const createMultiCompiler = options => {
	const compiler = webpack(
		Object.assign(
			[
				{
					name: "a",
					context: path.join(__dirname, "fixtures"),
					entry: "./a.js"
				},
				{
					name: "b",
					context: path.join(__dirname, "fixtures"),
					entry: "./b.js"
				}
			],
			options
		)
	);
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
	it("should respect parallelism and dependencies for running", done => {
		const compiler = createMultiCompiler({
			parallelism: 1,
			2: {
				name: "c",
				context: path.join(__dirname, "fixtures"),
				entry: "./a.js",
				dependencies: ["d", "e"]
			},
			3: {
				name: "d",
				context: path.join(__dirname, "fixtures"),
				entry: "./a.js"
			},
			4: {
				name: "e",
				context: path.join(__dirname, "fixtures"),
				entry: "./a.js"
			}
		});
		const events = [];
		compiler.compilers.forEach(c => {
			c.hooks.run.tap("test", () => {
				events.push(`${c.name} run`);
			});
			c.hooks.done.tap("test", () => {
				events.push(`${c.name} done`);
			});
		});
		compiler.run((err, stats) => {
			expect(events.join(" ")).toBe(
				"a run a done b run b done d run d done e run e done c run c done"
			);
			done();
		});
	});
	it("should respect parallelism and dependencies for watching", done => {
		const compiler = webpack(
			Object.assign(
				[
					{
						name: "a",
						mode: "development",
						context: path.join(__dirname, "fixtures"),
						entry: "./a.js",
						dependencies: ["b", "c"]
					},
					{
						name: "b",
						mode: "development",
						context: path.join(__dirname, "fixtures"),
						entry: "./b.js"
					},
					{
						name: "c",
						mode: "development",
						context: path.join(__dirname, "fixtures"),
						entry: "./a.js"
					}
				],
				{ parallelism: 1 }
			)
		);
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		const watchCallbacks = [];
		const watchCallbacksUndelayed = [];
		compiler.watchFileSystem = {
			watch(
				files,
				directories,
				missing,
				startTime,
				options,
				callback,
				callbackUndelayed
			) {
				watchCallbacks.push(callback);
				watchCallbacksUndelayed.push(callbackUndelayed);
			}
		};
		const events = [];
		compiler.compilers.forEach(c => {
			c.hooks.watchRun.tap("test", () => {
				events.push(`${c.name} run`);
			});
			c.hooks.done.tap("test", () => {
				events.push(`${c.name} done`);
			});
		});

		let update = 0;
		const watching = compiler.watch({}, (err, stats) => {
			if (err) return done(err);
			const info = () => stats.toString({ preset: "summary", version: false });
			switch (update++) {
				case 0:
					expect(info()).toMatchInlineSnapshot(`
							"a:
							  a compiled successfully

							b:
							  b compiled successfully

							c:
							  c compiled successfully"
					`);
					expect(compiler.compilers[0].modifiedFiles).toBe(undefined);
					expect(compiler.compilers[0].removedFiles).toBe(undefined);
					expect(events).toMatchInlineSnapshot(`
							Array [
							  "b run",
							  "b done",
							  "c run",
							  "c done",
							  "a run",
							  "a done",
							]
					`);
					events.length = 0;
					// wait until watching begins
					setTimeout(() => {
						watchCallbacksUndelayed[0]();
						watchCallbacks[0](null, new Map(), new Map(), new Set(), new Set());
					}, 100);
					break;
				case 1:
					expect(info()).toMatchInlineSnapshot(`
				"a:
				  a compiled successfully

				b:
				  b compiled successfully"
			`);
					expect(compiler.compilers[1].modifiedFiles).toEqual(new Set());
					expect(compiler.compilers[1].removedFiles).toEqual(new Set());
					expect(events).toMatchInlineSnapshot(`
				Array [
				  "b run",
				  "b done",
				  "a run",
				  "a done",
				]
			`);
					watchCallbacksUndelayed[2]();
					watchCallbacks[2](null, new Map(), new Map(), new Set(), new Set());
					break;
				case 2:
					expect(info()).toMatchInlineSnapshot(`
				"a:
				  a compiled successfully"
			`);
					expect(events).toMatchInlineSnapshot(`
				Array [
				  "b run",
				  "b done",
				  "a run",
				  "a done",
				  "a run",
				  "a done",
				]
			`);
					events.length = 0;
					watchCallbacksUndelayed[0]();
					watchCallbacksUndelayed[1]();
					watchCallbacks[0](null, new Map(), new Map(), new Set(), new Set());
					watchCallbacks[1](null, new Map(), new Map(), new Set(), new Set());
					break;
				case 3:
					expect(info()).toMatchInlineSnapshot(`
				"a:
				  a compiled successfully

				b:
				  b compiled successfully

				c:
				  c compiled successfully"
			`);
					expect(events).toMatchInlineSnapshot(`
				Array [
				  "b run",
				  "b done",
				  "c run",
				  "c done",
				  "a run",
				  "a done",
				]
			`);
					events.length = 0;
					watching.close(err => {
						if (err) return done(err);
						compiler.close(done);
					});
					break;
				default:
					done(new Error("unexpected"));
			}
		});
	});
});
