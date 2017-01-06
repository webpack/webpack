var should = require("should");
var path = require("path");
var fs = require("fs");
var vm = require("vm");
var Test = require("mocha/lib/test");
var checkArrayExpectation = require("./checkArrayExpectation");

var Stats = require("../lib/Stats");
var webpack = require("../lib/webpack");

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
		minimize: true,
		plugins: [
			new webpack.optimize.UglifyJsPlugin({
				sourceMap: false
			})
		]
	}, {
		name: "minimized-source-map",
		devtool: "eval-cheap-module-source-map",
		minimize: true,
		plugins: [
			new webpack.optimize.UglifyJsPlugin()
		]
	}, {
		name: "minimized-hashed-modules",
		minimize: true,
		plugins: [
			new webpack.optimize.UglifyJsPlugin(),
			new webpack.HashedModuleIdsPlugin()
		]
	}, {
		name: "all-combined",
		devtool: "#@source-map",
		minimize: true,
		plugins: [
			new webpack.HotModuleReplacementPlugin(),
			new webpack.optimize.UglifyJsPlugin(),
			new webpack.NamedModulesPlugin()
		]
	}].forEach(function(config) {
		describe(config.name, function() {
			categories.forEach(function(category) {
				describe(category.name, function() {
					this.timeout(30000);
					category.tests.filter(function(test) {
						var testDirectory = path.join(casesPath, category.name, test);
						var filterPath = path.join(testDirectory, "test.filter.js");
						if(fs.existsSync(filterPath) && !require(filterPath)(config)) {
							describe.skip(test, function() {
								it('filtered');
							});
							return false;
						}
						return true;
					}).forEach(function(testName) {
						var suite = describe(testName, function() {});
						it(testName + " should compile", function(done) {
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
									modules: ["web_modules", "node_modules"],
									mainFields: ["webpack", "browser", "web", "browserify", ["jam", "main"], "main"],
									aliasFields: ["browser"],
									extensions: [".webpack.js", ".web.js", ".js", ".json"]
								},
								resolveLoader: {
									modules: ["web_loaders", "web_modules", "node_loaders", "node_modules"],
									mainFields: ["webpackLoader", "webLoader", "loader", "main"],
									extensions: [".webpack-loader.js", ".web-loader.js", ".loader.js", ".js"]
								},
								module: {
									loaders: [{
										test: /\.coffee$/,
										loader: "coffee-loader"
									}, {
										test: /\.jade$/,
										loader: "jade-loader"
									}]
								},
								plugins: (config.plugins || []).concat(function() {
									this.plugin("compilation", function(compilation) {
										["optimize", "optimize-modules-basic", "optimize-chunks-basic", "after-optimize-tree", "after-optimize-assets"].forEach(function(hook) {
											compilation.plugin(hook, function() {
												compilation.checkConstraints();
											});
										});
									});
								})
							};
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
