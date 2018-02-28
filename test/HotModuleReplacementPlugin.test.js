"use strict";

require("should");
const path = require("path");
const fs = require("fs");

const webpack = require("../");

describe("HotModuleReplacementPlugin", function() {
	this.timeout(10000);
	it("should not have circular hashes but equal if unmodified", done => {
		const entryFile = path.join(__dirname, "js", "entry.js");
		const statsFile1 = path.join(
			__dirname,
			"js",
			"HotModuleReplacementPlugin.test.stats1.txt"
		);
		const statsFile2 = path.join(
			__dirname,
			"js",
			"HotModuleReplacementPlugin.test.stats2.txt"
		);
		const recordsFile = path.join(__dirname, "js", "records.json");
		try {
			fs.mkdirSync(path.join(__dirname, "js"));
		} catch (e) {} // eslint-disable-line no-empty
		try {
			fs.unlinkSync(recordsFile);
		} catch (e) {} // eslint-disable-line no-empty
		const compiler = webpack({
			cache: false,
			entry: entryFile,
			recordsPath: recordsFile,
			output: {
				path: path.join(__dirname, "js")
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
				lastHash1.should.be.eql(
					oldHash1,
					"hash shouldn't change when bundle stay equal"
				);
				fs.writeFileSync(entryFile, "2", "utf-8");
				compiler.run((err, stats) => {
					if (err) throw err;
					const lastHash2 = stats.toJson().hash;
					fs.writeFileSync(statsFile1, stats.toString());
					lastHash2.should.not.be.eql(
						lastHash1,
						"hash should change when bundle changes"
					);
					fs.writeFileSync(entryFile, "1", "utf-8");
					compiler.run((err, stats) => {
						if (err) throw err;
						const currentHash1 = stats.toJson().hash;
						fs.writeFileSync(statsFile2, stats.toString());
						currentHash1.should.not.be.eql(
							lastHash1,
							"hash shouldn't change to the first hash if bundle changed back to first bundle"
						);
						fs.writeFileSync(entryFile, "2", "utf-8");
						compiler.run((err, stats) => {
							if (err) throw err;
							const currentHash2 = stats.toJson().hash;
							fs.writeFileSync(statsFile1, stats.toString());
							compiler.run((err, stats) => {
								if (err) throw err;
								stats.toJson().hash.should.be.eql(currentHash2);
								currentHash2.should.not.be.eql(lastHash2);
								currentHash1.should.not.be.eql(currentHash2);
								lastHash1.should.not.be.eql(lastHash2);
								done();
							});
						});
					});
				});
			});
		});
	});
});
