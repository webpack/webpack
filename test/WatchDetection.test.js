/*globals describe it before after  */
var should = require("should");
var path = require("path");
var fs = require("fs");
var MemoryFs = require("memory-fs");

var webpack = require("../");

describe("WatchDetection", function() {
	for(var changeTimeout = 0; changeTimeout < 100; changeTimeout += 10) {
		createTestCase(changeTimeout);
	}
	for(var changeTimeout = 100; changeTimeout <= 2000; changeTimeout += 100) {
		createTestCase(changeTimeout);
	}

	function createTestCase(changeTimeout) {
		describe("time between changes " + changeTimeout + "ms", function() {
			this.timeout(10000);
			var fixturePath = path.join(__dirname, "fixtures", "temp-" + changeTimeout);
			var filePath = path.join(fixturePath, "file.js");
			var file2Path = path.join(fixturePath, "file2.js");
			var loaderPath = path.join(__dirname, "fixtures", "delay-loader.js");
			before(function() {
				try {
					fs.mkdirSync(fixturePath);
				} catch(e) {}
				fs.writeFileSync(filePath, "require('./file2')", "utf-8");
				fs.writeFileSync(file2Path, "original", "utf-8");
			});
			after(function(done) {
				setTimeout(function() {
					try {
						fs.unlinkSync(filePath);
					} catch(e) {}
					try {
						fs.unlinkSync(file2Path);
					} catch(e) {}
					try {
						fs.rmdirSync(fixturePath);
					} catch(e) {}
					done();
				}, 100); // cool down a bit
			});
			it("should build the bundle correctly", function(done) {
				var compiler = webpack({
					entry: loaderPath + "!" + filePath,
					output: {
						path: "/",
						filename: "bundle.js"
					}
				});
				var memfs = compiler.outputFileSystem = new MemoryFs();
				var onChange;
				compiler.plugin("done", function() {
					if(onChange) onChange();
				});

				var watcher;

				step1();

				function step1() {
					onChange = function() {
						if(memfs.readFileSync("/bundle.js") && memfs.readFileSync("/bundle.js").toString().indexOf("original") >= 0)
							step2();
					}

					watcher = compiler.watch({
						aggregateTimeout: 50
					}, function() {});
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
					onChange = function() {
						if(memfs.readFileSync("/bundle.js").toString().indexOf("correct") >= 0)
							step4();
					}

					fs.writeFile(file2Path, "correct", "utf-8", handleError);
				}

				function step4() {
					onChange = null;

					watcher.close();

					done();
				}

				function handleError(err) {
					if(err) done(err);
				}
			});
		})
	}
});
