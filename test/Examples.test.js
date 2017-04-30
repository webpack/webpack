"use strict";

/* globals describe it */
require("should");
const path = require("path");
const fs = require("fs");
const webpack = require("../");

describe("Examples", () => {
	/**
	 * @desc find all examples with a build.js
	 * @type {Array<string>} example tests
	 */
	const examples = fs
		.readdirSync(path.join(__dirname, "..", "examples"))
		.map(name => path.join(__dirname, "..", "examples", name))
		.filter(p =>
			fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, "build.js"))
		);

	/**
	 * @desc default to empty object
	 *
	 * when we have a `test.js`
	 * 	call it with the test callback, return/break
	 *
	 * when the example has a `webpack.config`,
	 * 	load it
	 *  when array, compile each config
	 *
	 * otherwise,
	 * 	fallback to default empty object
	 */
	examples.forEach(examplePath => {
		it("should compile " + path.basename(examplePath), function(done) {
			this.timeout(20000);

			let options = {};
			let webpackConfigPath = path.join(examplePath, "webpack.config.js");
			let testFilePath = path.join(examplePath, "test.js");
			webpackConfigPath =
				webpackConfigPath.substr(0, 1).toUpperCase() +
				webpackConfigPath.substr(1);

			if(fs.existsSync(testFilePath)) {
				const test = require(testFilePath);
				test(done, webpack);
				return;
			}

			if(fs.existsSync(webpackConfigPath)) {
				options = require(webpackConfigPath);
			}
			if(Array.isArray(options)) {
				options.forEach(processOptions);
			} else {
				processOptions(options);
			}

			/**
			 * @desc when there is no webpack.config,
			 *       set defaults on the config
			 * @param  {Object} options webpack options
			 * @return {void}
			 */
			function processOptions(options) {
				options.context = examplePath;
				options.output = options.output || {};
				options.output.pathinfo = true;
				options.output.path = path.join(examplePath, "js");
				options.output.publicPath = "js/";
				if(!options.output.filename) options.output.filename = "output.js";
				if(!options.entry) options.entry = "./example.js";
			}

			/**
			 * @desc compile:
			 *       done(errors) when failing,
			 *       done() for passing
			 */
			webpack(options, (err, stats) => {
				if(err)
					return done(err);

				stats = stats.toJson({
					errorDetails: true,
				});

				if(stats.errors.length > 0)
					return done(new Error(stats.errors[0]));

				done();
			});
		});
	});
});
