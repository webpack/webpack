"use strict";

require("./helpers/warmup-webpack");
const path = require("path");

describe("RealContentHashPlugin", () => {
	jest.setTimeout(20000);
	it("generate", done => {
		const webpack = require("..");
		webpack(
			{
				mode: "production",
				context: path.join(__dirname, "fixtures", "contentHashTest"),
				target: "node",
				output: {
					path: path.join(__dirname, "js", "RealContentHash"),
					filename: "result.js",
					chunkFilename: "[contenthash:1].js",
					library: "output",
					libraryTarget: "commonjs"
				},
				entry: "./entry",
				optimization: {
					chunkIds: "natural",
					realContentHash: true
				}
			},
			(err, stats) => {
				if (err) return err;
				expect(stats.hasErrors()).toBe(false);
				expect(stats.hasWarnings()).toBe(false);
				// eslint-disable-next-line node/no-missing-require
				require("./js/RealContentHash/result").output("content", result => {
					expect(result).toBe("6");
					done();
				});
			}
		);
	});
});
