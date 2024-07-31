"use strict";

const path = require("path");
const fs = require("graceful-fs");

const webpack = require("..");

const pluginDir = path.join(__dirname, "js", "BannerPlugin");
const outputDir = path.join(pluginDir, "output");

it("should cache assets", done => {
	const entry1File = path.join(pluginDir, "entry1.js");
	const entry2File = path.join(pluginDir, "entry2.js");
	const outputFile = path.join(outputDir, "entry1.js");
	try {
		fs.mkdirSync(path.join(pluginDir), {
			recursive: true
		});
	} catch (_err) {
		// empty
	}
	const compiler = webpack({
		mode: "development",
		entry: {
			entry1: entry1File,
			entry2: entry2File
		},
		output: {
			path: outputDir
		},
		plugins: [new webpack.BannerPlugin("banner is a string")]
	});
	fs.writeFileSync(entry1File, "1", "utf-8");
	fs.writeFileSync(entry2File, "1", "utf-8");
	compiler.run(err => {
		if (err) return done(err);
		const footerFileResults = fs.readFileSync(outputFile, "utf8").split("\n");
		expect(footerFileResults[0]).toBe("/*! banner is a string */");
		fs.writeFileSync(entry2File, "2", "utf-8");
		compiler.run((err, stats) => {
			const { assets } = stats.toJson();
			expect(assets.find(as => as.name === "entry1.js").emitted).toBe(false);
			expect(assets.find(as => as.name === "entry2.js").emitted).toBe(true);
			done(err);
		});
	});
});

it("can place banner as footer", done => {
	const footerFile = path.join(pluginDir, "footerFile.js");
	const outputFile = path.join(outputDir, "footerFile.js");
	try {
		fs.mkdirSync(path.join(pluginDir), {
			recursive: true
		});
	} catch (_err) {
		// empty
	}
	const compiler = webpack({
		mode: "development",
		entry: {
			footerFile: footerFile
		},
		output: {
			path: outputDir
		},
		plugins: [
			new webpack.BannerPlugin({
				banner: "banner is a string",
				footer: true
			})
		]
	});
	fs.writeFileSync(footerFile, "footer", "utf-8");
	compiler.run(err => {
		if (err) return done(err);
		const footerFileResults = fs.readFileSync(outputFile, "utf8").split("\n");
		expect(footerFileResults.pop()).toBe("/*! banner is a string */");
		done();
	});
});

it("should allow to change stage", done => {
	const entryFile = path.join(pluginDir, "entry3.js");
	const outputFile = path.join(outputDir, "entry3.js");
	try {
		fs.mkdirSync(path.join(pluginDir), {
			recursive: true
		});
	} catch (_err) {
		// empty
	}
	const compiler = webpack({
		mode: "production",
		entry: {
			entry3: entryFile
		},
		output: {
			path: outputDir
		},
		plugins: [
			new webpack.BannerPlugin({
				raw: true,
				banner: "/* banner is a string */",
				stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT
			})
		]
	});
	fs.writeFileSync(entryFile, "console.log(1 + 1);", "utf-8");
	compiler.run(err => {
		if (err) return done(err);
		const fileResult = fs.readFileSync(outputFile, "utf8").split("\n");
		expect(fileResult[0]).toBe("/* banner is a string */");
		done();
	});
});
