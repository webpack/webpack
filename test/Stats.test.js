/*globals describe it */
"use strict";

const webpack = require("../lib/webpack");
const MemoryFs = require("memory-fs");

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
});
