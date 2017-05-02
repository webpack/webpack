/* globals describe, it, beforeEach, afterEach */
"use strict";
require("should");
const NormalModule = require("../lib/NormalModule");
const path = require("path");
const webpack = require("../lib/webpack");

describe("Resolution", function() {
	const resolutionDir = path.join(__dirname, "fixtures", "resolution");
	it("should prefer .mjs to .js", () => {
		const compiler = webpack({
			entry: path.join(resolutionDir, "mjs", "a")
		}, (err, stats) => {
			if(err) done(err);
		});
		
		compiler.compile((err, compilation) => {
			if(err) return void done(err);
			should(compilation).have.property("entries").with.lengthOf(1);

			const entry = compilation.entries[0];
			should(entry).equal([path.join(resolutionDir, "mjs", "a.mjs")]);
			done();
		});
	});

	it("should prefer .js to .json", () => {
		const compiler = webpack({
			entry: path.join(resolutionDir, "json", "a")
		}, (err, stats) => {
			if(err) done(err);
		});
		compiler.compile((err, compilation) => {
			if(err) return void done(err);
			should(compilation).have.property("entries").with.lengthOf(1);

			const entry = compilation.entries[0];
			should(entry).equal([path.join(resolutionDir, "json", "a.js")]);
			done();
		});
	});
});
