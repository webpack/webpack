var should = require("should");
var path = require("path");
var fs = require("fs");
var vm = require("vm");
var Test = require("mocha/lib/test");
var checkArrayExpectation = require("./checkArrayExpectation");

var webpack = require("../lib/webpack");

var harmony = (+process.versions.node.split(".")[0]) >= 4;

describe("TestCases", function() {
	var casesPath = path.join(__dirname, "cases");
	var categories = fs.readdirSync(casesPath);
	categories = categories.map(function(cat) {
		return {
			name: cat,
			tests: fs.readdirSync(path.join(casesPath, cat)).filter(function(folder) {
				return folder.indexOf("_") < 0;
			})
		};
	});
	[{
		name: "normal"
	}, {
		name: "hot",
		plugins: [
			new webpack.HotModuleReplacementPlugin()
		]
	}, {
		name: "hot-multi-step",
		plugins: [
			new webpack.HotModuleReplacementPlugin({
				multiStep: true
			})
		]
	}, {
		name: "devtool-eval",
		devtool: "eval"
	}, {
		name: "devtool-eval-named-modules",
		devtool: "eval",
		plugins: [
			new webpack.NamedModulesPlugin()
		]
	}, {
		name: "devtool-eval-source-map",
		devtool: "#eval-source-map"
	}, {
		name: "devtool-inline-source-map",
		devtool: "inline-source-map"
	}, {
		name: "devtool-source-map",
		devtool: "#@source-map"
	}, {
		name: "devtool-cheap-inline-source-map",
		devtool: "cheap-inline-source-map"
	}, {
		name: "devtool-cheap-eval-source-map",
		devtool: "cheap-eval-source-map"
	}, {
		name: "devtool-cheap-eval-module-source-map",
		devtool: "cheap-eval-module-source-map"
	}, {
		name: "devtool-cheap-source-map",
		devtool: "cheap-source-map"
	}, {
		name: "minimized",
		excludeNominimize: true,
		plugins: [
			new webpack.optimize.UglifyJsPlugin({
				sourceMap: false
			})
		]
	}, {
		name: "minimized-source-map",
		excludeNominimize: true,
		plugins: [
			new webpack.optimize.UglifyJsPlugin()
		]
	}, {
		name: "deduped",
		plugins: [
			new webpack.optimize.DedupePlugin(),
			new webpack.NamedModulesPlugin()
		]
	}, {
		name: "minimized-deduped",
		excludeNominimize: true,
		plugins: [
			new webpack.optimize.DedupePlugin(),
			new webpack.optimize.UglifyJsPlugin()
		]
	}, {
		name: "optimized",
		excludeNominimize: true,
		plugins: [
			new webpack.optimize.DedupePlugin(),
			new webpack.optimize.OccurrenceOrderPlugin(),
			new webpack.optimize.UglifyJsPlugin()
		]
	}, {
		name: "all-combined",
		devtool: "#@source-map",
		excludeNominimize: true,
		plugins: [
			new webpack.HotModuleReplacementPlugin(),
			new webpack.optimize.DedupePlugin(),
			new webpack.optimize.OccurrenceOrderPlugin(),
			new webpack.optimize.UglifyJsPlugin(),
			new webpack.NamedModulesPlugin()
		]
	}].forEach(function(config) {
		describe(config.name, function() {
			categories.forEach(function(category) {
				describe(category.name, function() {
					this.timeout(10000);
					category.tests.filter(function(test) {
						var minimizeCheckOk = !config.excludeNominimize || test.indexOf("nominimize") < 0;
						var harmonyCheckOk = !/^es6/.test(test) || harmony;
						return minimizeCheckOk && harmonyCheckOk;
					}).forEach(function(testName) {
						var suite = describe(testName, function() {});
						it(testName + " should compile", function(done) {
							this.timeout(10000);
							var testDirectory = path.join(casesPath, category.name, testName);
							var outputDirectory = path.join(__dirname, "js", config.name, category.name, testName);
							var options = {
								context: casesPath,
								entry: "./" + category.name + "/" + testName + "/index",
								target: "async-node",
								devtool: config.devtool,
								output: {
									pathinfo: true,
									path: outputDirectory,
									filename: "bundle.js"
								},
								resolve: {
									modulesDirectories: ["web_modules", "node_modules"],
									packageMains: ["webpack", "browser", "web", "browserify", ["jam", "main"], "main"],
									extensions: ["", ".webpack.js", ".web.js", ".js"],
									packageAlias: "browser"
								},
								resolveLoader: {
									modulesDirectories: ["web_loaders", "web_modules", "node_loaders", "node_modules"],
									packageMains: ["webpackLoader", "webLoader", "loader", "main"],
									extensions: ["", ".webpack-loader.js", ".web-loader.js", ".loader.js", ".js"]
								},
								module: {
									loaders: [{
										test: /\.json$/,
										loader: "json"
									}, {
										test: /\.coffee$/,
										loader: "coffee"
									}, {
										test: /\.jade$/,
										loader: "jade"
									}]
								},
								plugins: (config.plugins || []).concat(
									new webpack.dependencies.LabeledModulesPlugin()
								)
							};
							webpack(options, function(err, stats) {
								if(err) return done(err);
								var jsonStats = stats.toJson({
									errorDetails: true
								});
								if(checkArrayExpectation(testDirectory, jsonStats, "error", "Error", done)) return;
								if(checkArrayExpectation(testDirectory, jsonStats, "warning", "Warning", done)) return;
								var exportedTest = 0;

								function _it(title, fn) {
									var test = new Test(title, fn);
									suite.addTest(test);
									exportedTest++;
									return test;
								}

								function _require(module) {
									if(module.substr(0, 2) === "./") {
										var p = path.join(outputDirectory, module);
										var fn = vm.runInThisContext("(function(require, module, exports, __dirname, it) {" + fs.readFileSync(p, "utf-8") + "\n})", p);
										var module = {
											exports: {}
										};
										fn.call(module.exports, _require, module, module.exports, outputDirectory, _it);
										return module.exports;
									} else return require(module);
								}
								_require("./bundle.js");
								if(exportedTest === 0) return done(new Error("No tests exported by test case"));
								done();
							});
						});
					});
				});
			});
		});
	});
});
