/* globals describe it */
var should = require("should");
var path = require("path");
var fs = require("fs");
var vm = require("vm");
var Test = require("mocha/lib/test");
var checkArrayExpectation = require("./checkArrayExpectation");

var Stats = require("../lib/Stats");
var webpack = require("../lib/webpack");

describe("ConfigTestCases", function() {
	var casesPath = path.join(__dirname, "configCases");
	var categories = fs.readdirSync(casesPath);

	categories = categories.map(function(cat) {
		return {
			name: cat,
			tests: fs.readdirSync(path.join(casesPath, cat)).filter(function(folder) {
				return folder.indexOf("_") < 0;
			}).sort().filter(function(testName) {
				var testDirectory = path.join(casesPath, cat, testName);
				var filterPath = path.join(testDirectory, "test.filter.js");
				if(fs.existsSync(filterPath) && !require(filterPath)()) {
					describe.skip(testName, function() {
						it('filtered');
					});
					return false;
				}
				return true;
			})
		};
	});
	categories.forEach(function(category) {
		describe(category.name, function() {
			category.tests.forEach(function(testName) {
				var suite = describe(testName, function() {});
				it(testName + " should compile", function(done) {
					this.timeout(30000);
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
						if(typeof options.output.pathinfo === "undefined") options.output.pathinfo = true;
						if(!options.output.filename) options.output.filename = "bundle" + idx + ".js";
						if(!options.output.chunkFilename) options.output.chunkFilename = "[id].bundle" + idx + ".js";
					});
					webpack(options, function(err, stats) {
						if(err) return done(err);
						var statOptions = Stats.presetToOptions("verbose");
						statOptions.colors = false;
						fs.writeFileSync(path.join(outputDirectory, "stats.txt"), stats.toString(statOptions), "utf-8");
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

						var globalContext = {
							console: console
						};

						function _require(currentDirectory, module) {
							if(Array.isArray(module) || /^\.\.?\//.test(module)) {
								var fn;
								var content;
								if(Array.isArray(module)) {
									var p = path.join(currentDirectory, module[0]);
									content = module.map(function(p) {
										var p = path.join(currentDirectory, p);
										return fs.readFileSync(p, "utf-8");
									}).join("\n");
								} else {
									var p = path.join(currentDirectory, module);
									content = fs.readFileSync(p, "utf-8");
								}
								if(options.target === "web" || options.target === "webworker") {
									fn = vm.runInNewContext("(function(require, module, exports, __dirname, __filename, it, window) {" + content + "\n})", globalContext, p);
								} else {
									fn = vm.runInThisContext("(function(require, module, exports, __dirname, __filename, it) {" + content + "\n})", p);
								}
								var module = {
									exports: {}
								};
								fn.call(module.exports, _require.bind(null, path.dirname(p)), module, module.exports, path.dirname(p), p, _it, globalContext);
								return module.exports;
							} else if(testConfig.modules && module in testConfig.modules) {
								return testConfig.modules[module];
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

						if(testConfig.noTests) return process.nextTick(done);
						for(var i = 0; i < optionsArr.length; i++) {
							var bundlePath = testConfig.findBundle(i, optionsArr[i]);
							if(bundlePath) {
								filesCount++;
								_require(outputDirectory, bundlePath);
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
