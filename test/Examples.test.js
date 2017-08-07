"use strict";

/* globals describe it */
require("should");
const path = require("path");
const fs = require("fs");
const webpack = require("../");

describe("Examples", () => {
	const basePath = path.join(__dirname, "..", "examples");
	const examples = require("../examples/examples.js");

	examples.forEach((examplePath) => {
		it("should compile " + path.relative(basePath, examplePath), function(done) {
			this.timeout(20000);
			let options = {};
			let webpackConfigPath = path.join(examplePath, "webpack.config.js");
			webpackConfigPath = webpackConfigPath.substr(0, 1).toUpperCase() + webpackConfigPath.substr(1);
			if(fs.existsSync(webpackConfigPath))
				options = require(webpackConfigPath);
			if(Array.isArray(options))
				options.forEach(processOptions);
			else
				processOptions(options);

			function processOptions(options) {
				options.context = examplePath;
				options.output = options.output || {};
				options.output.pathinfo = true;
				options.output.path = path.join(examplePath, "js");
				options.output.publicPath = "js/";
				if(!options.output.filename)
					options.output.filename = "output.js";
				if(!options.entry)
					options.entry = "./example.js";
			}
			webpack(options, (err, stats) => {
				if(err) return done(err);
				stats = stats.toJson({
					errorDetails: true
				});
				if(stats.errors.length > 0) {
					return done(new Error(stats.errors[0]));
				}
				done();
			});
		});
	});
});
