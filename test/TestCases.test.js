/* global describe, it*/
"use strict";

require("should");
const path = require("path");
const fs = require("fs");
const vm = require("vm");
const Test = require("mocha/lib/test");
const checkArrayExpectation = require("./checkArrayExpectation");

const Stats = require("../lib/Stats");
const webpack = require("../lib/webpack");

describe("TestCases", () => {
	const casesPath = path.join(__dirname, "cases");
	let categories = fs.readdirSync(casesPath);
	categories = categories.map((cat) => {
		return {
			name: cat,
			tests: fs.readdirSync(path.join(casesPath, cat)).filter((folder) => folder.indexOf("_") < 0)
		};
	});
	[{
		name: "normal"
	}, {
		name: "concat",
		plugins: [
			new webpack.optimize.ModuleConcatenationPlugin()
		]
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
			new webpack.NamedModulesPlugin(),
			new webpack.NamedChunksPlugin()
		]
	}].forEach((config) => {
		describe(config.name, () => {
			categories.forEach((category) => {
				describe(category.name, function() {
					this.timeout(30000);
					category.tests.filter((test) => {
						const testDirectory = path.join(casesPath, category.name, test);
						const filterPath = path.join(testDirectory, "test.filter.js");
						if(fs.existsSync(filterPath) && !require(filterPath)(config)) {
							describe.skip(test, () => it("filtered"));
							return false;
						}
						return true;
					}).forEach((testName) => {
						const suite = describe(testName, () => {});
						it(testName + " should compile", (done) => {
							const testDirectory = path.join(casesPath, category.name, testName);
							const outputDirectory = path.join(__dirname, "js", config.name, category.name, testName);
							const options = {
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
									this.plugin("compilation", (compilation) => {
										["optimize", "optimize-modules-basic", "optimize-chunks-basic", "after-optimize-tree", "after-optimize-assets"].forEach((hook) => {
											compilation.plugin(hook, () => compilation.checkConstraints());
										});
									});
								})
							};
							webpack(options, (err, stats) => {
								if(err) return done(err);
								const statOptions = Stats.presetToOptions("verbose");
								statOptions.colors = false;
								fs.writeFileSync(path.join(outputDirectory, "stats.txt"), stats.toString(statOptions), "utf-8");
								const jsonStats = stats.toJson({
									errorDetails: true
								});
								if(checkArrayExpectation(testDirectory, jsonStats, "error", "Error", done)) return;
								if(checkArrayExpectation(testDirectory, jsonStats, "warning", "Warning", done)) return;
								let exportedTest = 0;

								function _it(title, fn) {
									const test = new Test(title, fn);
									suite.addTest(test);
									exportedTest++;
									return test;
								}

								function _require(module) {
									if(module.substr(0, 2) === "./") {
										const p = path.join(outputDirectory, module);
										const fn = vm.runInThisContext("(function(require, module, exports, __dirname, it) {" + fs.readFileSync(p, "utf-8") + "\n})", p);
										const m = {
											exports: {}
										};
										fn.call(m.exports, _require, m, m.exports, outputDirectory, _it);
										return m.exports;
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
