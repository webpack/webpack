"use strict";

const path = require("path");
const fs = require("graceful-fs");

const webpack = require("..");

describe("HotModuleReplacementPlugin", () => {
	jest.setTimeout(20000);
	it("should not have circular hashes but equal if unmodified", done => {
		const entryFile = path.join(
			__dirname,
			"js",
			"HotModuleReplacementPlugin",
			"entry.js"
		);
		const statsFile1 = path.join(
			__dirname,
			"js",
			"HotModuleReplacementPlugin",
			"HotModuleReplacementPlugin.test.stats1.txt"
		);
		const statsFile2 = path.join(
			__dirname,
			"js",
			"HotModuleReplacementPlugin",
			"HotModuleReplacementPlugin.test.stats2.txt"
		);
		const recordsFile = path.join(
			__dirname,
			"js",
			"HotModuleReplacementPlugin",
			"records.json"
		);
		try {
			fs.mkdirSync(path.join(__dirname, "js", "HotModuleReplacementPlugin"), {
				recursive: true
			});
		} catch (e) {
			// empty
		}
		try {
			fs.unlinkSync(recordsFile);
		} catch (e) {
			// empty
		}
		const compiler = webpack({
			cache: false,
			entry: entryFile,
			recordsPath: recordsFile,
			output: {
				path: path.join(__dirname, "js", "HotModuleReplacementPlugin")
			},
			plugins: [new webpack.HotModuleReplacementPlugin()],
			optimization: {
				moduleIds: "size",
				chunkIds: "size"
			}
		});
		fs.writeFileSync(entryFile, "1", "utf-8");
		compiler.run((err, stats) => {
			if (err) throw err;
			const oldHash1 = stats.toJson().hash;
			fs.writeFileSync(statsFile1, stats.toString());
			compiler.run((err, stats) => {
				if (err) throw err;
				const lastHash1 = stats.toJson().hash;
				fs.writeFileSync(statsFile2, stats.toString());
				expect(lastHash1).toBe(oldHash1); // hash shouldn't change when bundle stay equal
				fs.writeFileSync(entryFile, "2", "utf-8");
				compiler.run((err, stats) => {
					if (err) throw err;
					const lastHash2 = stats.toJson().hash;
					fs.writeFileSync(statsFile1, stats.toString());
					expect(lastHash2).not.toBe(lastHash1); // hash should change when bundle changes
					fs.writeFileSync(entryFile, "1", "utf-8");
					compiler.run((err, stats) => {
						if (err) throw err;
						const currentHash1 = stats.toJson().hash;
						fs.writeFileSync(statsFile2, stats.toString());
						expect(currentHash1).not.toBe(lastHash1); // hash shouldn't change to the first hash if bundle changed back to first bundle
						fs.writeFileSync(entryFile, "2", "utf-8");
						compiler.run((err, stats) => {
							if (err) throw err;
							const currentHash2 = stats.toJson().hash;
							fs.writeFileSync(statsFile1, stats.toString());
							compiler.run((err, stats) => {
								if (err) throw err;
								expect(stats.toJson().hash).toBe(currentHash2);
								expect(currentHash2).not.toBe(lastHash2);
								expect(currentHash1).not.toBe(currentHash2);
								expect(lastHash1).not.toBe(lastHash2);
								done();
							});
						});
					});
				});
			});
		});
	}, 120000);

	it("should correct working when entry is Object and key is a number", done => {
		const outputPath = path.join(__dirname, "js", "HotModuleReplacementPlugin");
		const entryFile = path.join(outputPath, "entry.js");
		const statsFile3 = path.join(
			outputPath,
			"HotModuleReplacementPlugin.test.stats3.txt"
		);
		const statsFile4 = path.join(
			outputPath,
			"HotModuleReplacementPlugin.test.stats4.txt"
		);
		const recordsFile = path.join(outputPath, "records.json");
		try {
			fs.mkdirSync(outputPath, { recursive: true });
		} catch (e) {
			// empty
		}
		try {
			fs.unlinkSync(recordsFile);
		} catch (e) {
			// empty
		}
		const compiler = webpack({
			mode: "development",
			cache: false,
			entry: {
				0: entryFile
			},
			recordsPath: recordsFile,
			output: {
				path: outputPath
			},
			plugins: [new webpack.HotModuleReplacementPlugin()],
			optimization: {
				chunkIds: "named"
			}
		});
		fs.writeFileSync(entryFile, "1", "utf-8");
		compiler.run((err, stats) => {
			if (err) throw err;
			const jsonStats = stats.toJson();
			const hash = jsonStats.hash;
			const chunkName = Object.keys(jsonStats.assetsByChunkName)[0];
			fs.writeFileSync(statsFile3, stats.toString());
			compiler.run((err, stats) => {
				if (err) throw err;
				fs.writeFileSync(statsFile4, stats.toString());
				fs.writeFileSync(entryFile, "2", "utf-8");
				compiler.run((err, stats) => {
					if (err) throw err;
					fs.writeFileSync(statsFile3, stats.toString());
					const result = JSON.parse(
						fs.readFileSync(
							path.join(outputPath, `0.${hash}.hot-update.json`),
							"utf-8"
						)
					)["c"];
					expect(result).toEqual([chunkName]);
					done();
				});
			});
		});
	});

	it("should handle entryFile that contains path variable", done => {
		const entryFile = path.join(
			__dirname,
			"js",
			"HotModuleReplacementPlugin",
			"[name]",
			"entry.js"
		);
		const statsFile3 = path.join(
			__dirname,
			"js",
			"HotModuleReplacementPlugin",
			"HotModuleReplacementPlugin.test.stats3.txt"
		);
		const statsFile4 = path.join(
			__dirname,
			"js",
			"HotModuleReplacementPlugin",
			"HotModuleReplacementPlugin.test.stats4.txt"
		);
		const recordsFile = path.join(
			__dirname,
			"js",
			"HotModuleReplacementPlugin",
			"records.json"
		);
		try {
			fs.mkdirSync(
				path.join(__dirname, "js", "HotModuleReplacementPlugin", "[name]"),
				{
					recursive: true
				}
			);
		} catch (e) {
			// empty
		}
		try {
			fs.unlinkSync(recordsFile);
		} catch (e) {
			// empty
		}
		const compiler = webpack({
			mode: "development",
			cache: false,
			entry: {
				"[name]/entry.js": entryFile
			},
			recordsPath: recordsFile,
			output: {
				filename: "[name]",
				chunkFilename: "[name].js",
				path: path.join(__dirname, "js", "HotModuleReplacementPlugin"),
				hotUpdateChunkFilename: "static/webpack/[id].[hash].hot-update.js",
				hotUpdateMainFilename: "static/webpack/[hash].hot-update.json"
			},
			plugins: [new webpack.HotModuleReplacementPlugin()],
			optimization: {
				chunkIds: "named"
			}
		});
		fs.writeFileSync(entryFile, "1", "utf-8");
		compiler.run((err, stats) => {
			if (err) return done(err);
			fs.writeFileSync(statsFile3, stats.toString());
			compiler.run((err, stats) => {
				if (err) return done(err);
				fs.writeFileSync(statsFile4, stats.toString());
				fs.writeFileSync(entryFile, "2", "utf-8");
				compiler.run((err, stats) => {
					if (err) return done(err);
					fs.writeFileSync(statsFile3, stats.toString());

					let foundUpdates = false;

					Object.keys(stats.compilation.assets).forEach(key => {
						foundUpdates =
							foundUpdates ||
							!!key.match(
								/static\/webpack\/\[name\]\/entry\.js\..*?\.hot-update\.js/
							);
					});

					expect(foundUpdates).toBe(true);
					done();
				});
			});
		});
	});
});
