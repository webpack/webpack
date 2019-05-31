"use strict";

/*globals describe it */
const path = require("path");
const fs = require("fs");

const webpack = require("../");

describe("WatchSuspend", () => {
	if (process.env.NO_WATCH_TESTS) {
		it.skip("long running tests excluded", () => {});
		return;
	}

	jest.setTimeout(5000);

	describe("suspend ans resume watcher", () => {
		const fixturePath = path.join(
			__dirname,
			"fixtures",
			"temp-watch-" + Date.now()
		);
		const filePath = path.join(fixturePath, "file.js");
		let compiler = null;
		let watching = null;

		beforeAll(() => {
			try {
				fs.mkdirSync(fixturePath);
			} catch (e) {
				// skip
			}
			try {
				fs.writeFileSync(filePath, "'foo'", "utf-8");
			} catch (e) {
				// skip
			}
		});

		afterAll(done => {
			watching.close();
			compiler = null;
			setTimeout(() => {
				try {
					fs.unlinkSync(filePath);
				} catch (e) {
					// skip
				}
				try {
					fs.rmdirSync(fixturePath);
				} catch (e) {
					// skip
				}
				done();
			}, 100); // cool down a bit
		});

		it("should compile successfully", done => {
			compiler = webpack({
				mode: "development",
				entry: filePath,
				output: {
					path: fixturePath,
					filename: "bundle.js"
				}
			});
			watching = compiler.watch({ aggregateTimeout: 50 }, err => {
				expect(err).toBe(null);
				done();
			});
		});

		it("should suspend compilation", done => {
			const spy = jest.fn();
			watching.suspend();
			fs.writeFileSync(filePath, "'bar'", "utf-8");
			compiler.hooks.compilation.tap("WatchSuspendTest", spy);
			// compiler.hooks.done.tap("WatchSuspendTest", spy);
			setTimeout(() => {
				expect(spy.mock.calls.length).toBe(0);
				done();
			}, 100); // 2x aggregateTimeout
		});

		it("should resume compilation", done => {
			compiler.hooks.done.tap("WatchSuspendTest", () => {
				const outputPath = path.join(fixturePath, "bundle.js");
				expect(fs.readFileSync(outputPath, "utf-8")).toContain("'bar'");
				done();
			});
			watching.resume();
		});
	});
});
