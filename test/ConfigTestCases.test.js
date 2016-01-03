var should = require("should");
var path = require("path");
var fs = require("fs");
var vm = require("vm");
var Test = require("mocha/lib/test");
var checkArrayExpectation = require("./checkArrayExpectation");

var webpack = require("../lib/webpack");

describe("ConfigTestCases", function() {
	var casesPath = path.join(__dirname, "configCases");
	var categories = fs.readdirSync(casesPath);
	categories = categories.map(function(cat) {
		return {
			name: cat,
			tests: fs.readdirSync(path.join(casesPath, cat)).filter(function(folder) {
				return folder.indexOf("_") < 0;
			})
		};
	});
	categories.forEach(function(category) {
		describe(category.name, function() {
			category.tests.forEach(function(testName) {
				var suite = describe(testName, function() {});
				it(testName + " should compile", function(done) {
					this.timeout(10000);
					var testDirectory = path.join(casesPath, category.name, testName);
					var outputDirectory = path.join(__dirname, "js", "config", category.name, testName);
					var options = require(path.join(testDirectory, "webpack.config.js"));
					var optionsArr = [].concat(options);
					optionsArr.forEach(function(options, idx) {
						if(!options.context) options.context = testDirectory;
						if(!options.entry) options.entry = "./index.js";
						if(!options.target) options.target = "async-node";
						if(!options.output) options.output = {};
						if(!options.output.path) options.output.path = outputDirectory;
						if(!options.output.filename) options.output.filename = "bundle" + idx + ".js";
						if(!options.output.chunkFilename) options.output.chunkFilename = "[id].bundle" + idx + ".js";
					});
					webpack(options, function(err, stats) {
						if(err) return done(err);
						fs.writeFileSync(path.join(outputDirectory, "stats.txt"), stats.toString({
							reasons: true,
							errorDetails: true
						}), "utf-8");
						var jsonStats = stats.toJson({
							errorDetails: true
						});
						if(checkArrayExpectation(testDirectory, jsonStats, "error", "Error", done)) return;
						if(checkArrayExpectation(testDirectory, jsonStats, "warning", "Warning", done)) return;
						var exportedTests = 0;

						function _it(title, fn) {
							var test = new Test(title, fn);
							suite.addTest(test);
							exportedTests++;
							return test;
						}

						function _require(module) {
							if(module.substr(0, 2) === "./") {
								var p = path.join(outputDirectory, module);
								var fn;
								if(options.target === "web") {
									fn = vm.runInNewContext("(function(require, module, exports, __dirname, __filename, it) {" + fs.readFileSync(p, "utf-8") + "\n})", {}, p);
								} else {
									fn = vm.runInThisContext("(function(require, module, exports, __dirname, __filename, it) {" + fs.readFileSync(p, "utf-8") + "\n})", p);
								}
								var module = {
									exports: {}
								};
								fn.call(module.exports, _require, module, module.exports, outputDirectory, p, _it);
								return module.exports;
							} else return require(module);
						}
						var filesCount = 0;
						var testConfig = {
							findBundle: function(i, options) {
								if(fs.existsSync(path.join(options.output.path, "bundle" + i + ".js"))) {
									return "./bundle" + i + ".js";
								}
							}
						};
						try {
							// try to load a test file
							testConfig = require(path.join(testDirectory, "test.config.js"));
						} catch(e) {}
						for(var i = 0; i < optionsArr.length; i++) {
							var bundlePath = testConfig.findBundle(i, optionsArr[i]);
							if(bundlePath) {
								filesCount++;
								_require(bundlePath);
							}
						}
						// give a free pass to compilation that generated an error
						if(!jsonStats.errors.length && filesCount !== optionsArr.length) return done(new Error("Should have found at least one bundle file per webpack config"));
						if(exportedTests < filesCount) return done(new Error("No tests exported by test case"));
						process.nextTick(done);
					});
				});
			});
		});
	});
});
