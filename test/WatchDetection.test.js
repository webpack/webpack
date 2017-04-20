"use strict";

const path = require("path");
const fs = require("fs");
const MemoryFs = require("memory-fs");

const webpack = require("../");

describe("WatchDetection", () => {
	// simplifying this to just test order of change magnitude; really slows down the tests otherwise
	createTestCase(0);
	createTestCase(10);
	createTestCase(100);
	createTestCase(1000);

	function createTestCase(changeTimeout) {
		describe("time between changes " + changeTimeout + "ms", function() {
			const fixturePath = path.join(__dirname, "fixtures", "temp-" + changeTimeout);
			const filePath = path.join(fixturePath, "file.js");
			const file2Path = path.join(fixturePath, "file2.js");
			const loaderPath = path.join(__dirname, "fixtures", "delay-loader.js");

			beforeEach(() => {
				try {
					fs.mkdirSync(fixturePath);
				} catch(e) {}

				fs.writeFileSync(filePath, "require('./file2')", "utf-8");
				fs.writeFileSync(file2Path, "original", "utf-8");
			});

			afterEach(() => {
				try {
					fs.unlinkSync(filePath);
				} catch(e) {}

				try {
					fs.unlinkSync(file2Path);
				} catch(e) {}

				try {
					fs.rmdirSync(fixturePath);
				} catch(e) {}
			});

			it("should build the bundle correctly", (done) => {
				const compiler = webpack({
					entry: loaderPath + "!" + filePath,
					output: {
						path: "/",
						filename: "bundle.js"
					}
				});

				const memfs = compiler.outputFileSystem = new MemoryFs();
				let onChange;

				compiler.plugin("done", () => {
					if (onChange) {
						onChange();
					}
				});

				let watcher;

				step1();

				function step1() {
					onChange = () => {
						if (memfs.readFileSync("/bundle.js") && memfs.readFileSync("/bundle.js").toString().indexOf("original") >= 0) {
							step2();
						}
					};

					watcher = compiler.watch({
						aggregateTimeout: 50
					}, () => {});
				}

				function step2() {
					onChange = null;

					fs.writeFile(filePath, "require('./file2'); again", "utf-8", handleError);

					setTimeout(step3, changeTimeout);
				}

				function step3() {
					onChange = null;

					fs.writeFile(file2Path, "wrong", "utf-8", handleError);

					setTimeout(step4, changeTimeout);
				}

				function step4() {
					onChange = () => {
						if (memfs.readFileSync("/bundle.js").toString().indexOf("correct") >= 0) {
							cleanup();
						}
					};

					fs.writeFile(file2Path, "correct", "utf-8", handleError);
				}

				function cleanup() {
					watcher.close(done);
				}

				function handleError(err) {
					if(err) done(err);
				}
			}, 10000);
		});
	}
});
