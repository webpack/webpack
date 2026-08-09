"use strict";

const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");
const webpack = require("../lib/index");

/** @typedef {import("../lib/util/fs").OutputFileSystem} OutputFileSystem */

// The synthetic page is built from `EntryOptionPlugin`'s entry hook, which runs
// before the first compilation — nothing lazily loaded at a compilation
// boundary may be read from there. Jest resets the module registry per file, so
// this is the first build in the process and nothing has warmed those loads.
describe("output.html with a JavaScript entry", () => {
	it("should wrap the entry before the first compilation", (done) => {
		const context = path.resolve(__dirname, "fixtures");
		const compiler = webpack({
			mode: "development",
			context,
			entry: "./a.js",
			experiments: { html: true },
			output: {
				path: "/out",
				html: { title: "Title" }
			}
		});
		compiler.outputFileSystem = /** @type {OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.run((err, stats) => {
			if (err) return done(err);
			const { errors } = /** @type {import("../lib/Stats")} */ (stats).toJson({
				all: false,
				errors: true
			});
			expect(errors).toEqual([]);
			compiler.close(done);
		});
	});
});
