/*globals describe it */
"use strict";

const webpack = require("../lib/webpack");
const MemoryFs = require("memory-fs");
const Stats = require("../lib/Stats");
const packageJson = require("../package.json");
const path = require("path");
describe("Stats", () => {
	it("should print env string in stats", done => {
		const compiler = webpack({
			context: __dirname,
			entry: "./fixtures/a"
		});
		compiler.outputFileSystem = new MemoryFs();
		compiler.run((err, stats) => {
			if (err) return done(err);
			try {
				expect(
					stats.toString({
						all: false,
						env: true,
						_env: "production"
					})
				).toBe('Environment (--env): "production"');
				expect(
					stats.toString({
						all: false,
						env: true,
						_env: {
							prod: ["foo", "bar"],
							baz: true
						}
					})
				).toBe(
					"Environment (--env): {\n" +
						'  "prod": [\n' +
						'    "foo",\n' +
						'    "bar"\n' +
						"  ],\n" +
						'  "baz": true\n' +
						"}"
				);
				done();
			} catch (e) {
				done(e);
			}
		});
	});
	it("toJson should return plain object representation", done => {
		const compiler = webpack({
			context: __dirname,
			entry: "./fixtures/a",
			mode: "none"
		});
		compiler.outputFileSystem = new MemoryFs();
		compiler.hooks.make.tap("Test toJson method", compilation => {
			try {
				const stats = new Stats(compilation);
				const result = stats.toJson();
				expect(result).toEqual({
					assets: [],
					assetsByChunkName: {},
					children: [],
					chunks: [],
					entrypoints: {},
					filteredAssets: 0,
					filteredModules: 0,
					errors: [],
					modules: [],
					namedChunkGroups: {},
					hash: undefined,
					outputPath: path.resolve("./", "dist"),
					publicPath: "",
					version: packageJson.version,
					warnings: []
				});
				done();
			} catch (err) {
				done(err);
			}
		});
		compiler.run(err => {
			if (err) done(err);
		});
	});
});
