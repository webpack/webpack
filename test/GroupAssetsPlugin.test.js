"use strict";

const path = require("path");
const fs = require("graceful-fs");
const webpack = require("..");

const pluginDir = path.join(__dirname, "js", "GroupAssetsPlugin");
const outputDir = path.join(pluginDir, "output");

it("will group all assets into a folder", async () => {
	try {
		fs.mkdirSync(path.join(pluginDir), {
			recursive: true
		});
	} catch (e) {
		// empty
	}

	const groupAssetsPlugin = new webpack.GroupAssetsPlugin();

	const compiler = webpack({
		mode: "development",
		entry: {
			chunk: "./grouped.js"
		},
		target: "node",
		context: path.join(__dirname, "fixtures"),
		optimization: {
			splitChunks: {
				chunks: "all"
			}
		},
		output: {
			path: outputDir
		},
		plugins: [groupAssetsPlugin]
	});
	await new Promise((resolve, reject) =>
		compiler.run((err, result) => {
			if (err) {
				reject(err);
			} else {
				resolve(result);
			}
		})
	);

	expect(fs.existsSync(path.join(outputDir, "chunk.js"))).toBe(true);
	expect(
		fs.existsSync(
			path.join(outputDir, "vendors-node_modules_lodash_countBy_js.js")
		)
	).toBe(true);

	expect(fs.existsSync(path.join(outputDir, "chunk.dir"))).toBe(true);
	expect(fs.existsSync(path.join(outputDir, "chunk.dir", "chunk.js"))).toBe(
		true
	);
	expect(
		fs.existsSync(
			path.join(
				outputDir,
				"chunk.dir",
				"vendors-node_modules_lodash_countBy_js.js"
			)
		)
	).toBe(true);
});
