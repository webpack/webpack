"use strict";

require("./helpers/warmup-webpack");

const { Volume, createFsFromVolume } = require("memfs");
const webpack = require("..");

const compile = (options) =>
	new Promise((resolve, reject) => {
		const compiler = webpack(options);
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		compiler.run((err, stats) => {
			if (err) {
				reject(err);
			} else {
				resolve(stats);
			}
		});
	});

describe("Compiler root path", () => {
	it("should successfully build with output.path set to /", async () => {
		const stats = await compile({
			context: __dirname,
			entry: "./fixtures/a",
			output: {
				path: "/",
				filename: "bundle.js"
			}
		});

		expect(stats.hasErrors()).toBe(false);
		expect(stats.hasWarnings()).toBe(false);
	});
});
