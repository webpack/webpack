"use strict";

require("./helpers/warmup-webpack");
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

const close = (watching, compiler, done) => {
	watching.close(err => {
		if (err) return done(err);
		compiler.close(done);
	});
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
			compiler.close(done);
		});
	});

	it("should trigger 'watchRun' for each child compiler", done => {
		const compiler = createMultiCompiler();
		let called = 0;

		compiler.hooks.watchRun.tap("MultiCompiler test", () => called++);
		const watching = compiler.watch(1000, err => {
			if (err) {
				throw err;
			}
			expect(called).toBe(2);
			close(watching, compiler, done);
		});
	});

	it("should not be running twice at a time (run)", done => {
		const compiler = createMultiCompiler();
		compiler.run((err, stats) => {
			if (err) return done(err);
		});
		compiler.run((err, stats) => {
			if (err) {
				compiler.close(done);
			}
		});
	});
	it("should not be running twice at a time (watch)", done => {
		const compiler = createMultiCompiler();
		const watching = compiler.watch({}, (err, stats) => {
			if (err) return done(err);
		});
		compiler.watch({}, (err, stats) => {
			if (err) {
				close(watching, compiler, done);
			}
		});
	});
	it("should not be running twice at a time (run - watch)", done => {
		const compiler = createMultiCompiler();
		compiler.run((err, stats) => {
			if (err) return done(err);
		});
		compiler.watch({}, (err, stats) => {
			if (err) {
				compiler.close(done);
			}
		});
	});
	it("should not be running twice at a time (watch - run)", done => {
		const compiler = createMultiCompiler();
		let watching;
		watching = compiler.watch({}, (err, stats) => {
			if (err) return done(err);
		});
		compiler.run((err, stats) => {
			if (err) {
				close(watching, compiler, done);
			}
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
			if (err) {
				compiler.close(done);
			}
		});
	});
	it("should run again correctly after first compilation", done => {
		const compiler = createMultiCompiler();
		compiler.run((err, stats) => {
			if (err) return done(err);

			compiler.run((err, stats) => {
				if (err) return done(err);
				compiler.close(done);
			});
		});
	});
	it("should watch again correctly after first compilation", done => {
		const compiler = createMultiCompiler();
		compiler.run((err, stats) => {
			if (err) return done(err);

			let watching;
			watching = compiler.watch({}, (err, stats) => {
				if (err) return done(err);
				close(watching, compiler, done);
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
				compiler.close(done);
			});
		});
	});
	it("should watch again correctly after first closed watch", done => {
		const compiler = createMultiCompiler();
		const watching = compiler.watch({}, (err, stats) => {
			if (err) return done(err);
		});
		watching.close(() => {
			const watching2 = compiler.watch({}, (err, stats) => {
				if (err) return done(err);
				close(watching2, compiler, done);
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
			compiler.close(done);
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
			c.hooks.invalid.tap("test", () => {
				events.push(`${c.name} invalid`);
			});
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
				  "b invalid",
				  "b run",
				  "b done",
				  "a invalid",
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
				  "b invalid",
				  "b run",
				  "b done",
				  "a invalid",
				  "a run",
				  "a done",
				  "a invalid",
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
				  "b invalid",
				  "c invalid",
				  "b run",
				  "b done",
				  "c run",
				  "c done",
				  "a invalid",
				  "a run",
				  "a done",
				]
			`);
					events.length = 0;
					close(watching, compiler, done);
					break;
				default:
					done(new Error("unexpected"));
			}
		});
	});

	it("should respect parallelism when using invalidate", done => {
		const configs = [
			{
				name: "a",
				mode: "development",
				entry: { a: "./a.js" },
				context: path.join(__dirname, "fixtures")
			},
			{
				name: "b",
				mode: "development",
				entry: { b: "./b.js" },
				context: path.join(__dirname, "fixtures")
			}
		];
		configs.parallelism = 1;
		const compiler = webpack(configs);

		const events = [];
		compiler.compilers.forEach(c => {
			c.hooks.invalid.tap("test", () => {
				events.push(`${c.name} invalid`);
			});
			c.hooks.watchRun.tap("test", () => {
				events.push(`${c.name} run`);
			});
			c.hooks.done.tap("test", () => {
				events.push(`${c.name} done`);
			});
		});

		compiler.watchFileSystem = { watch() {} };
		compiler.outputFileSystem = createFsFromVolume(new Volume());

		let state = 0;
		const watching = compiler.watch({}, error => {
			if (error) {
				done(error);
				return;
			}
			if (state !== 0) return;
			state++;

			expect(events).toMatchInlineSnapshot(`
			Array [
			  "a run",
			  "a done",
			  "b run",
			  "b done",
			]
		`);
			events.length = 0;

			watching.invalidate(err => {
				try {
					if (err) return done(err);

					expect(events).toMatchInlineSnapshot(`
				Array [
				  "a invalid",
				  "b invalid",
				  "a run",
				  "a done",
				  "b run",
				  "b done",
				]
			`);
					events.length = 0;
					expect(state).toBe(1);
					setTimeout(() => {
						close(watching, compiler, done);
					}, 1000);
				} catch (e) {
					console.error(e);
					done(e);
				}
			});
		});
	}, 2000);

	it("should respect dependencies when using invalidate", done => {
		const compiler = webpack([
			{
				name: "a",
				mode: "development",
				entry: { a: "./a.js" },
				context: path.join(__dirname, "fixtures"),
				dependencies: ["b"]
			},
			{
				name: "b",
				mode: "development",
				entry: { b: "./b.js" },
				context: path.join(__dirname, "fixtures")
			}
		]);

		const events = [];
		compiler.compilers.forEach(c => {
			c.hooks.invalid.tap("test", () => {
				events.push(`${c.name} invalid`);
			});
			c.hooks.watchRun.tap("test", () => {
				events.push(`${c.name} run`);
			});
			c.hooks.done.tap("test", () => {
				events.push(`${c.name} done`);
			});
		});

		compiler.watchFileSystem = { watch() {} };
		compiler.outputFileSystem = createFsFromVolume(new Volume());

		let state = 0;
		const watching = compiler.watch({}, error => {
			if (error) {
				done(error);
				return;
			}
			if (state !== 0) return;
			state++;

			expect(events).toMatchInlineSnapshot(`
			Array [
			  "b run",
			  "b done",
			  "a run",
			  "a done",
			]
		`);
			events.length = 0;

			watching.invalidate(err => {
				try {
					if (err) return done(err);

					expect(events).toMatchInlineSnapshot(`
				Array [
				  "a invalid",
				  "b invalid",
				  "b run",
				  "b done",
				  "a run",
				  "a done",
				]
			`);
					events.length = 0;
					expect(state).toBe(1);
					setTimeout(() => {
						close(watching, compiler, done);
					}, 1000);
				} catch (e) {
					console.error(e);
					done(e);
				}
			});
		});
	}, 2000);

	it("shouldn't hang when invalidating watchers", done => {
		const entriesA = { a: "./a.js" };
		const entriesB = { b: "./b.js" };
		const compiler = webpack([
			{
				name: "a",
				mode: "development",
				entry: () => entriesA,
				context: path.join(__dirname, "fixtures")
			},
			{
				name: "b",
				mode: "development",
				entry: () => entriesB,
				context: path.join(__dirname, "fixtures")
			}
		]);

		compiler.watchFileSystem = { watch() {} };
		compiler.outputFileSystem = createFsFromVolume(new Volume());

		const watching = compiler.watch({}, error => {
			if (error) {
				done(error);
				return;
			}

			entriesA.b = "./b.js";
			entriesB.a = "./a.js";

			watching.invalidate(err => {
				if (err) return done(err);
				close(watching, compiler, done);
			});
		});
	}, 2000);

	it("shouldn't hang when invalidating during build", done => {
		const compiler = webpack(
			Object.assign([
				{
					name: "a",
					mode: "development",
					context: path.join(__dirname, "fixtures"),
					entry: "./a.js"
				},
				{
					name: "b",
					mode: "development",
					context: path.join(__dirname, "fixtures"),
					entry: "./b.js",
					dependencies: ["a"]
				}
			])
		);
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		const watchCallbacks = [];
		const watchCallbacksUndelayed = [];
		let firstRun = true;
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
				if (firstRun && files.has(path.join(__dirname, "fixtures", "a.js"))) {
					process.nextTick(() => {
						callback(null, new Map(), new Map(), new Set(), new Set());
					});
					firstRun = false;
				}
			}
		};
		const watching = compiler.watch({}, (err, stats) => {
			if (err) return done(err);
			close(watching, compiler, done);
		});
	});
});
