"use strict";

const webpack = require("..");
const MemoryFs = require("memory-fs");

describe("MultiStats", () => {
	it("should create JSON of children stats", done => {
		const compiler = webpack([
			{
				context: __dirname,
				entry: "./fixtures/a"
			},
			{
				context: __dirname,
				entry: "./fixtures/b"
			}
		]);
		compiler.outputFileSystem = new MemoryFs();
		compiler.run((err, stats) => {
			if (err) return done(err);
			try {
				const statsObject = stats.toJson();
				expect(statsObject).toEqual(
					expect.objectContaining({ children: expect.any(Array) })
				);
				expect(statsObject.children).toHaveLength(2);
				done();
			} catch (e) {
				done(e);
			}
		});
	});
});
