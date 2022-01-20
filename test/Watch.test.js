"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const webpack = require("..");
const { createFsFromVolume, Volume } = require("memfs");

describe("Watch", () => {
	jest.setTimeout(10000);

	it("should only compile a single time", done => {
		let counterBeforeCompile = 0;
		let counterDone = 0;
		let counterHandler = 0;
		const compiler = webpack(
			{
				context: path.resolve(__dirname, "fixtures/watch"),
				watch: true,
				mode: "development",
				snapshot: {
					managedPaths: [/^(.+?[\\/]node_modules[\\/])/]
				},
				experiments: {
					futureDefaults: true
				},
				module: {
					// unsafeCache: false,
					rules: [
						{
							test: /\.js$/,
							use: "some-loader"
						}
					]
				},
				plugins: [
					c => {
						c.hooks.beforeCompile.tap("test", () => {
							counterBeforeCompile++;
						});
						c.hooks.done.tap("test", () => {
							counterDone++;
						});
					}
				]
			},
			(err, stats) => {
				if (err) return done(err);
				if (stats.hasErrors()) return done(new Error(stats.toString()));
				counterHandler++;
			}
		);
		compiler.outputFileSystem = createFsFromVolume(new Volume());
		setTimeout(() => {
			expect(counterBeforeCompile).toBe(1);
			expect(counterDone).toBe(1);
			expect(counterHandler).toBe(1);
			compiler.close(done);
		}, 5000);
	});
});
