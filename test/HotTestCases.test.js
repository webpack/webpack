var should = require("should");
var path = require("path");
var fs = require("fs");
var vm = require("vm");
var Test = require("mocha/lib/test");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var checkArrayExpectation = require("./checkArrayExpectation");

var webpack = require("../lib/webpack");

describe("HotTestCases", function() {
	var casesPath = path.join(__dirname, "hotCases");
	var categories = fs.readdirSync(casesPath).filter(function(dir) {
		return fs.statSync(path.join(casesPath, dir)).isDirectory();
	});
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
				var suite = describe(testName, function() {
					this.timeout(10000);
				});
				it(testName + " should compile", function(done) {
					var testDirectory = path.join(casesPath, category.name, testName);
					var outputDirectory = path.join(__dirname, "js", "hot-cases", category.name, testName);
					var recordsPath = path.join(outputDirectory, "records.json");
					if(fs.existsSync(recordsPath))
						fs.unlinkSync(recordsPath);
					var fakeUpdateLoaderOptions = {
						options: {
							updateIndex: 0
						}
					};
					var options = {
						context: testDirectory,
						entry: "./index.js",
						output: {
							path: outputDirectory,
							filename: "bundle.js"
						},
						module: {
							loaders: [{
								test: /\.js$/,
								loader: path.join(__dirname, "hotCases", "fake-update-loader.js"),
								enforce: "pre"
							}, {
								test: /\.css$/,
								loader: ExtractTextPlugin.extract({
									fallbackLoader: "style-loader",
									loader: "css-loader"
								})
							}]
						},
						target: "async-node",
						plugins: [
							new webpack.HotModuleReplacementPlugin(),
							new webpack.NamedModulesPlugin(),
							new webpack.LoaderOptionsPlugin(fakeUpdateLoaderOptions),
							new ExtractTextPlugin("bundle.css")
						],
						recordsPath: recordsPath
					}
					var compiler = webpack(options);
					compiler.run(function(err, stats) {
						if(err) return done(err);
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

						function _next(callback) {
							fakeUpdateLoaderOptions.options.updateIndex++;
							compiler.run(function(err, stats) {
								if(err) return done(err);
								var jsonStats = stats.toJson({
									errorDetails: true
								});
								if(checkArrayExpectation(testDirectory, jsonStats, "error", "errors" + fakeUpdateLoaderOptions.options.updateIndex, "Error", done)) return;
								if(checkArrayExpectation(testDirectory, jsonStats, "warning", "warnings" + fakeUpdateLoaderOptions.options.updateIndex, "Warning", done)) return;
								if(callback) callback(jsonStats);
							})
						}

						function _require(module) {
							if(module.substr(0, 2) === "./") {
								var p = path.join(outputDirectory, module);
								var fn = vm.runInThisContext("(function(require, module, exports, __dirname, __filename, it, NEXT, STATS) {" + fs.readFileSync(p, "utf-8") + "\n})", p);
								var module = {
									exports: {}
								};
								fn.call(module.exports, _require, module, module.exports, outputDirectory, p, _it, _next, jsonStats);
								return module.exports;
							} else return require(module);
						}
						_require("./bundle.js");
						if(exportedTests < 1) return done(new Error("No tests exported by test case"));
						process.nextTick(done);
					});
				});
			});
		});
	});
});
