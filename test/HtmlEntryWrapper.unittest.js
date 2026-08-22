"use strict";

const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");
const webpack = require("../lib/index");

/** @import { OutputFileSystem } from "../lib/util/fs" */

// The entry hook builds the page before the first compilation, so nothing loaded
// at a compilation boundary is warm — this must stay the process's first build.
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
