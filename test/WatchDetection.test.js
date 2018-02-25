"use strict";

/*globals describe it before after  */
require("should");
const path = require("path");
const fs = require("fs");
const MemoryFs = require("memory-fs");

const webpack = require("../");

describe("WatchDetection", () => {
	if (process.env.NO_WATCH_TESTS) {
		it("long running tests excluded");
		return;
	}

	for (let changeTimeout = 0; changeTimeout < 100; changeTimeout += 10) {
		createTestCase(changeTimeout);
	}
	for (let changeTimeout = 100; changeTimeout <= 2000; changeTimeout += 100) {
		createTestCase(changeTimeout);
	}

	function createTestCase(changeTimeout) {
		describe("time between changes " + changeTimeout + "ms", function() {
			this.timeout(10000);
			const fixturePath = path.join(
				__dirname,
				"fixtures",
				"temp-" + changeTimeout
			);
			const filePath = path.join(fixturePath, "file.js");
			const file2Path = path.join(fixturePath, "file2.js");
			const loaderPath = path.join(__dirname, "fixtures", "delay-loader.js");
			before(() => {
				try {
					fs.mkdirSync(fixturePath);
				} catch (e) {} // eslint-disable-line no-empty
				fs.writeFileSync(filePath, "require('./file2')", "utf-8");
				fs.writeFileSync(file2Path, "original", "utf-8");
			});
			after(done => {
				setTimeout(() => {
					try {
						fs.unlinkSync(filePath);
					} catch (e) {} // eslint-disable-line no-empty
					try {
						fs.unlinkSync(file2Path);
					} catch (e) {} // eslint-disable-line no-empty
					try {
						fs.rmdirSync(fixturePath);
					} catch (e) {} // eslint-disable-line no-empty
					done();
				}, 100); // cool down a bit
			});
			it("should build the bundle correctly", done => {
				const compiler = webpack({
					entry: loaderPath + "!" + filePath,
					output: {
						path: "/",
						filename: "bundle.js"
					}
				});
				const memfs = (compiler.outputFileSystem = new MemoryFs());
				let onChange;
				compiler.hooks.done.tap("WatchDetectionTest", () => {
					if (onChange) onChange();
				});

				let watcher;

				step1();

				function step1() {
					onChange = () => {
						if (
							memfs.readFileSync("/bundle.js") &&
							memfs
								.readFileSync("/bundle.js")
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
					onChange = null;

					fs.writeFile(
						filePath,
						"require('./file2'); again",
						"utf-8",
						handleError
					);

					setTimeout(step3, changeTimeout);
				}

				function step3() {
					onChange = null;

					fs.writeFile(file2Path, "wrong", "utf-8", handleError);

					setTimeout(step4, changeTimeout);
				}

				function step4() {
					onChange = () => {
						if (
							memfs
								.readFileSync("/bundle.js")
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
						setTimeout(done, 1000);
					});
				}

				function handleError(err) {
					if (err) done(err);
				}
			});
		});
	}
});
