"use strict";

const path = require("path");
const fs = require("fs");
const webpack = require("../");
const rimraf = require("rimraf");

describe("Profiling Plugin", function() {
	jest.setTimeout(15000);

	it("should handle output path with folder creation", done => {
		const finalPath = "test/js/profilingPath/events.json";
		const outputPath = path.join(__dirname, "/js/profilingPath");
		rimraf(outputPath, () => {
			const compiler = webpack({
				context: "/",
				entry: "./fixtures/a.js",
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
