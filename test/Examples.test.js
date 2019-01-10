"use strict";

/* globals describe it */
const path = require("path");
const fs = require("fs");
const webpack = require("../");

describe("Examples", () => {
	const basePath = path.join(__dirname, "..", "examples");
	const examples = require("../examples/examples.js");

	examples.forEach(examplePath => {
		const filterPath = path.join(examplePath, "test.filter.js");
		const relativePath = path.relative(basePath, examplePath);
		if (fs.existsSync(filterPath) && !require(filterPath)()) {
			describe.skip(relativePath, () => it("filtered"));
			return;
		}
		it(
			"should compile " + relativePath,
			function(done) {
				let options = {};
				let webpackConfigPath = path.join(examplePath, "webpack.config.js");
				webpackConfigPath =
					webpackConfigPath.substr(0, 1).toUpperCase() +
					webpackConfigPath.substr(1);
				if (fs.existsSync(webpackConfigPath))
					options = require(webpackConfigPath);
				if (Array.isArray(options)) options.forEach(processOptions);
				else processOptions(options);

				function processOptions(options) {
					options.context = examplePath;
					options.output = options.output || {};
					options.output.pathinfo = true;
					options.output.path = path.join(examplePath, "dist");
					options.output.publicPath = "dist/";
					if (!options.entry) options.entry = "./example.js";
					if (!options.plugins) options.plugins = [];
					// To support deprecated loaders
					// TODO remove in webpack 5
					options.plugins.push(
						new webpack.LoaderOptionsPlugin({
							options: {}
						})
					);
				}
				webpack(options, (err, stats) => {
					if (err) return done(err);
					stats = stats.toJson({
						errorDetails: true
					});
					if (stats.errors.length > 0) {
						return done(new Error(stats.errors[0]));
					}
					done();
				});
			},
			45000
		);
	});
});
