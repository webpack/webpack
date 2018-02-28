/*globals describe it */
"use strict";

require("should");

const webpack = require("../lib/webpack");
const MemoryFs = require("memory-fs");

describe("Stats", () => {
	it("should print env string in stats", function(done) {
		const compiler = webpack({
			context: __dirname,
			entry: "./fixtures/a"
		});
		compiler.outputFileSystem = new MemoryFs();
		compiler.run((err, stats) => {
			if (err) return done(err);
			try {
				stats
					.toString({
						all: false,
						env: true,
						_env: "production"
					})
					.should.be.eql('Environment (--env): "production"');
				stats
					.toString({
						all: false,
						env: true,
						_env: {
							prod: ["foo", "bar"],
							baz: true
						}
					})
					.should.be.eql(
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
