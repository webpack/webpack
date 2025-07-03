"use strict";

const path = require("path");
const fs = require("graceful-fs");
const { Volume, createFsFromVolume } = require("memfs");

const webpack = require("..");

describe("WatchDetection", () => {
	if (process.env.NO_WATCH_TESTS) {
		// eslint-disable-next-line jest/no-disabled-tests
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

	/**
	 * @param {number} changeTimeout change timeout
	 * @param {boolean=} invalidate need invalidate?
	 */
	function createTestCase(changeTimeout, invalidate) {
		describe(`time between changes ${changeTimeout}ms${
			invalidate ? " with invalidate call" : ""
		}`, () => {
			const fixturePath = path.join(
				__dirname,
				"fixtures",
				`temp-${changeTimeout}`
			);
			const filePath = path.join(fixturePath, "file.js");
			const file2Path = path.join(fixturePath, "file2.js");
			const loaderPath = path.join(__dirname, "fixtures", "delay-loader.js");

			beforeAll(() => {
				try {
					fs.mkdirSync(fixturePath);
				} catch (_err) {
					// empty
				}
				fs.writeFileSync(filePath, "require('./file2')", "utf8");
				fs.writeFileSync(file2Path, "original", "utf8");
			});

			afterAll(done => {
				setTimeout(() => {
					try {
						fs.unlinkSync(filePath);
					} catch (_err) {
						// empty
					}
					try {
						fs.unlinkSync(file2Path);
					} catch (_err) {
						// empty
					}
					try {
						fs.rmdirSync(fixturePath);
					} catch (_err) {
						// empty
					}
					done();
				}, 100); // cool down a bit
			});

			it("should build the bundle correctly", done => {
				const compiler = webpack({
					mode: "development",
					entry: `${loaderPath}!${filePath}`,
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

				/**
				 * @returns {void}
				 */
				function step1() {
					onChange = () => {
						if (
							memfs.readFileSync("/directory/bundle.js") &&
							memfs
								.readFileSync("/directory/bundle.js")
								.toString()
								.includes("original")
						) {
							step2();
						}
					};

					watcher = compiler.watch(
						{
							aggregateTimeout: 50
						},
						() => {}
					);
				}

				/**
				 * @returns {void}
				 */
				function step2() {
					onChange = () => {
						expect(compiler.modifiedFiles).toBeDefined();
						expect(compiler.removedFiles).toBeDefined();
					};

					fs.writeFile(
						filePath,
						"require('./file2'); again",
						"utf8",
						handleError
					);

					setTimeout(step3, changeTimeout);
				}

				/**
				 * @returns {void}
				 */
				function step3() {
					if (invalidate) watcher.invalidate();
					fs.writeFile(file2Path, "wrong", "utf8", handleError);

					setTimeout(step4, changeTimeout);
				}

				/**
				 * @returns {void}
				 */
				function step4() {
					onChange = () => {
						expect(compiler.modifiedFiles).toBeDefined();
						expect(compiler.removedFiles).toBeDefined();
						if (
							memfs
								.readFileSync("/directory/bundle.js")
								.toString()
								.includes("correct")
						) {
							step5();
						}
					};

					fs.writeFile(file2Path, "correct", "utf8", handleError);
				}

				/**
				 * @returns {void}
				 */
				function step5() {
					onChange = null;

					watcher.close(() => {
						setTimeout(done, 500);
					});
				}

				/**
				 * @param {unknown} err err
				 */
				function handleError(err) {
					if (err) done(err);
				}
			});
		});
	}
});
