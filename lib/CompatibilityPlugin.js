/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConstDependency = require("./dependencies/ConstDependency");

const NullFactory = require("./NullFactory");

const jsonLoaderPath = require.resolve("json-loader");
const matchJson = /\.json$/i;

const parserHelpersLocation = require.resolve("./ParserHelpers");

class CompatibilityPlugin {

	apply(compiler) {
		compiler.plugin("compilation", (compilation, params) => {
			compilation.dependencyFactories.set(ConstDependency, new NullFactory());
			compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

			params.normalModuleFactory.plugin("parser", (parser, parserOptions) => {

				if(typeof parserOptions.browserify !== "undefined" && !parserOptions.browserify)
					return;

				parser.plugin("call require", {
					path: parserHelpersLocation,
					fnName: "CompatibilityCallRequire"
				});
			});

			params.normalModuleFactory.plugin("after-resolve", (data, done) => {
				// if this is a json file and there are no loaders active, we use the json-loader in order to avoid parse errors
				// @see https://github.com/webpack/webpack/issues/3363
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
