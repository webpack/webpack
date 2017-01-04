"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const ConstDependency = require("./dependencies/ConstDependency");
const NullFactory = require("./NullFactory");
const jsonLoaderPath = require.resolve("json-loader");
const matchJson = /\.json$/i;
class CompatibilityPlugin {
	apply(compiler) {
		compiler.plugin("compilation", function(compilation, params) {
			compilation.dependencyFactories.set(ConstDependency, new NullFactory());
			compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
			params.normalModuleFactory.plugin("parser", function(parser, parserOptions) {
				// this is no documentation for this option
				if(typeof parserOptions.browserify !== "undefined" && !parserOptions.browserify) {
					return;
				}
				parser.plugin("call require", function(expr) {
					// support for browserify style require delegator: "require(o, !0)"
					if(expr.arguments.length !== 2) {
						return;
					}
					const second = this.evaluateExpression(expr.arguments[1]);
					if(!second.isBoolean()) {
						return;
					}
					if(second.asBool() !== true) {
						return;
					}
					const dep = new ConstDependency("require", expr.callee.range);
					dep.loc = expr.loc;
					if(this.state.current.dependencies.length > 1) {
						const last = this.state.current.dependencies[this.state.current.dependencies.length - 1];
						if(last.critical && last.request === "." && last.userRequest === "." && last.recursive) {
							this.state.current.dependencies.pop();
						}
					}
					this.state.current.addDependency(dep);
					return true;
				});
			});
			params.normalModuleFactory.plugin("after-resolve", function(data, done) {
				// if this is a json file and there are no loaders active, we use the json-loader in order to avoid
				// parse errors @see https://github.com/webpack/webpack/issues/3363
				if(matchJson.test(data.request) && data.loaders.length === 0) {
					data.loaders.push({
						loader: jsonLoaderPath
					});
				}
				done(null, data);
			});
		});
	}
}
module.exports = CompatibilityPlugin;
