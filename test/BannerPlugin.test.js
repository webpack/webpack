"use strict";

const path = require("path");
const fs = require("graceful-fs");

const webpack = require("..");

it("should cache assets", done => {
	const entry1File = path.join(__dirname, "js", "BannerPlugin", "entry1.js");
	const entry2File = path.join(__dirname, "js", "BannerPlugin", "entry2.js");
	try {
		fs.mkdirSync(path.join(__dirname, "js", "BannerPlugin"), {
			recursive: true
		});
	} catch (e) {
		// empty
	}
	const compiler = webpack({
		mode: "development",
		entry: {
			entry1: entry1File,
			entry2: entry2File
		},
		output: {
			path: path.join(__dirname, "js", "BannerPlugin", "output")
		},
		plugins: [new webpack.BannerPlugin("banner is a string")]
	});
	fs.writeFileSync(entry1File, "1", "utf-8");
	fs.writeFileSync(entry2File, "1", "utf-8");
	compiler.run(err => {
		if (err) return done(err);
		fs.writeFileSync(entry2File, "2", "utf-8");
		compiler.run((err, stats) => {
			const { assets } = stats.toJson();
			expect(assets.find(as => as.name === "entry1.js").emitted).toBe(false);
			expect(assets.find(as => as.name === "entry2.js").emitted).toBe(true);
			done(err);
		});
	});
});
