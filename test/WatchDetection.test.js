"use strict";

const path = require("path");
const fs = require("graceful-fs");
const { createFsFromVolume, Volume } = require("memfs");

const webpack = require("..");

describe("WatchDetection", () => {
	if (process.env.NO_WATCH_TESTS) {
		it.skip("long running tests excluded", () => {});
		return;
	}

	jest.setTimeout(10000);

	createTestCase(100, true);
	createTestCase(10, true);
	createTestCase(600, true);
	for (let changeTimeout = 10; changeTimeout < 100; changeTimeout += 10) {
		createTestCase(changeTimeout);
	}
	for (let changeTimeout = 200; changeTimeout <= 2000; changeTimeout += 200) {
		createTestCase(changeTimeout);
	}

	function createTestCase(changeTimeout, invalidate) {
		describe(`time between changes ${changeTimeout}ms${
			invalidate ? " with invalidate call" : ""
		}`, () => {
			const fixturePath = path.join(
				__dirname,
				"fixtures",
				"temp-" + changeTimeout
			);
			const filePath = path.join(fixturePath, "file.js");
			const file2Path = path.join(fixturePath, "file2.js");
			const loaderPath = path.join(__dirname, "fixtures", "delay-loader.js");

			beforeAll(() => {
				try {
					fs.mkdirSync(fixturePath);
				} catch (e) {
					// empty
				}
				fs.writeFileSync(filePath, "require('./file2')", "utf-8");
				fs.writeFileSync(file2Path, "original", "utf-8");
			});

			afterAll(done => {
				setTimeout(() => {
					try {
						fs.unlinkSync(filePath);
					} catch (e) {
						// empty
					}
					try {
						fs.unlinkSync(file2Path);
					} catch (e) {
						// empty
					}
					try {
						fs.rmdirSync(fixturePath);
					} catch (e) {
						// empty
					}
					done();
				}, 100); // cool down a bit
			});

			it("should build the bundle correctly", done => {
				const compiler = webpack({
					mode: "development",
					entry: loaderPath + "!" + filePath,
					output: {
						path: "/directory",
						filename: "bundle.js"
					}
				});
				const memfs = (compiler.outputFileSystem = createFsFromVolume(
					new Volume()
				));
				let onChange;
				compiler.hooks.done.tap("WatchDetectionTest", () => {
					if (onChange) onChange();
				});

				let watcher;

				step1();

				function step1() {
					onChange = () => {
						if (
							memfs.readFileSync("/directory/bundle.js") &&
							memfs
								.readFileSync("/directory/bundle.js")
								.toString()
								.indexOf("original") >= 0
						)
							step2();
					};

					watcher = compiler.watch(
						{
							aggregateTimeout: 50
						},
						() => {}
					);
				}

				function step2() {
					onChange = () => {
						expect(compiler.modifiedFiles).not.toBe(undefined);
						expect(compiler.removedFiles).not.toBe(undefined);
					};

					fs.writeFile(
						filePath,
						"require('./file2'); again",
						"utf-8",
						handleError
					);

					setTimeout(step3, changeTimeout);
				}

				function step3() {
					if (invalidate) watcher.invalidate();
					fs.writeFile(file2Path, "wrong", "utf-8", handleError);

					setTimeout(step4, changeTimeout);
				}

				function step4() {
					onChange = () => {
						expect(compiler.modifiedFiles).not.toBe(undefined);
						expect(compiler.removedFiles).not.toBe(undefined);
						if (
							memfs
								.readFileSync("/directory/bundle.js")
								.toString()
								.indexOf("correct") >= 0
						)
							step5();
					};

					fs.writeFile(file2Path, "correct", "utf-8", handleError);
				}

				function step5() {
					onChange = null;

					watcher.close(() => {
						setTimeout(done, 500);
					});
				}

				function handleError(err) {
					if (err) done(err);
				}
			});
		});
	}
});
