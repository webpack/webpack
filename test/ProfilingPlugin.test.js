"use strict";

const path = require("path");
const fs = require("graceful-fs");
const webpack = require("../");
const rimraf = require("rimraf");

describe("Profiling Plugin", function () {
	jest.setTimeout(30000);

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

	it("should profiling on every compilation under watch mode", done => {
		const fixturePath = path.join(
			__dirname,
			"fixtures",
			"temp-watch-" + Date.now()
		);
		const filePath = path.join(fixturePath, "file.js");

		try {
			fs.mkdirSync(fixturePath);
		} catch (e) {
			// skip
		}
		try {
			fs.writeFileSync(filePath, "'foo'", "utf-8");
		} catch (e) {
			// skip
		}

		const outputPath = path.join(__dirname, "js/profilingPathUnderWatchMode");
		const finalPath = path.join(outputPath, "events.json");
		const finalPath1 = path.join(outputPath, "events_1.json");
		const finalPath2 = path.join(outputPath, "events_2.json");
		let compilationIndex = 1;

		rimraf(outputPath, () => {
			const compiler = webpack({
				mode: "development",
				context: __dirname,
				entry: filePath,
				output: {
					path: path.join(__dirname, "js/profilingOut")
				},
				plugins: [
					new webpack.debug.ProfilingPlugin({
						outputPath: finalPath
					})
				]
			});

			const watching = compiler.watch({ aggregateTimeout: 50 }, () => {});

			setTimeout(() => {
				fs.writeFileSync(filePath, "'bar'", "utf-8");
			}, 1500);

			setTimeout(() => {
				fs.writeFileSync(filePath, "'baz'", "utf-8");
			}, 3000);

			compiler.hooks.done.tap("ProfilingUnderWatchTest", () => {
				if (compilationIndex === 1) {
					if (
						!fs.existsSync(finalPath) ||
						fs.existsSync(finalPath1) ||
						fs.existsSync(finalPath2)
					)
						return done(new Error("Initial build output should be created."));
				}

				if (compilationIndex === 2) {
					if (!fs.existsSync(finalPath1) || fs.existsSync(finalPath2))
						return done(
							new Error("Incremental build output should be created 1.")
						);
				}

				if (compilationIndex === 3) {
					if (!fs.existsSync(finalPath2))
						return done(
							new Error("Incremental build output should be created 2.")
						);
					watching.close();
					done();
				}

				compilationIndex++;
			});
		});
	});
});
