"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const fs = require("graceful-fs");

describe("Examples", () => {
	const basePath = path.join(__dirname, "..", "examples");
	const examples = require("../examples/examples.js");

	for (const examplePath of examples) {
		const filterPath = path.join(examplePath, "test.filter.js");
		const relativePath = path.relative(basePath, examplePath);
		if (fs.existsSync(filterPath) && !require(filterPath)()) {
			// eslint-disable-next-line jest/no-disabled-tests, jest/valid-describe-callback
			describe.skip(relativePath, () =>
				it("filtered", done => {
					done();
				})
			);
			continue;
		}
		it(`should compile ${relativePath}`, function (done) {
			let options = {};
			let webpackConfigPath = path.join(examplePath, "webpack.config.js");
			webpackConfigPath =
				webpackConfigPath.slice(0, 1).toUpperCase() +
				webpackConfigPath.slice(1);
			if (fs.existsSync(webpackConfigPath))
				options = require(webpackConfigPath);
			if (typeof options === "function") options = options();
			if (Array.isArray(options)) {
				for (const [_, item] of options.entries()) {
					processOptions(item);
				}
			} else {
				processOptions(options);
			}

			function processOptions(options) {
				options.context = examplePath;
				options.output = options.output || {};
				options.output.pathinfo = true;
				options.output.path = path.join(examplePath, "dist");
				options.output.publicPath = "dist/";
				if (!options.entry) options.entry = "./example.js";
				if (!options.plugins) options.plugins = [];
			}
			const webpack = require("..");
			webpack(options, (err, stats) => {
				if (err) return done(err);
				if (stats.hasErrors()) {
					return done(
						new Error(
							stats.toString({
								all: false,
								errors: true,
								errorDetails: true,
								errorStacks: true
							})
						)
					);
				}
				done();
			});
		}, 90000);
	}
});
