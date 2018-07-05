"use strict";

const path = require("path");
const fs = require("fs");
const mkdirp = require("mkdirp");

const webpack = require("../");

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
			mkdirp.sync(path.join(__dirname, "js", "HotModuleReplacementPlugin"));
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
			plugins: [
				new webpack.HotModuleReplacementPlugin(),
				new webpack.optimize.OccurrenceOrderPlugin()
			]
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
	});
});
