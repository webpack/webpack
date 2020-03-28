"use strict";

const path = require("path");
const fs = require("graceful-fs");
const webpack = require("../");
const rimraf = require("rimraf");

describe("Profiling Plugin", function () {
	jest.setTimeout(15000);

	it("should handle output path with folder creation", done => {
		const outputPath = path.join(__dirname, "js/profilingPath");
		const finalPath = path.join(outputPath, "events.json");
		rimraf(outputPath, () => {
			const compiler = webpack({
				context: __dirname,
				entry: "./fixtures/a.js",
				output: {
					path: path.join(__dirname, "js/profilingOut")
				},
				plugins: [
					new webpack.debug.ProfilingPlugin({
						outputPath: finalPath
					})
				]
			});
			compiler.run(err => {
				if (err) return done(err);
				if (!fs.existsSync(outputPath))
					return done(new Error("Folder should be created."));
				done();
			});
		});
	});
});
