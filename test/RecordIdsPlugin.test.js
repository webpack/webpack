/* globals describe, before, it */
"use strict";

const should = require("should");
const path = require("path");

const webpack = require("../lib/webpack");
const identifierUtils = require("../lib/util/identifier");

describe("RecordIdsPlugin", () => {

	let compiler;

	before(() => {
		compiler = webpack({
			entry: "./nodetest/entry",
			context: path.join(__dirname, "fixtures"),
			output: {
				path: path.join(__dirname, "nodetest", "js"),
				filename: "result1.js"
			}
		});

		compiler.plugin("compilation", (compilation, callback) => {
			compilation.plugin("should-record", () => true);
		});
	});

	it("should cache identifiers", (done) => {
		compiler.compile((err, compilation) => {
			if(err) done(err);
			let pass = true;
			for(let i = 0; i < compilation.modules.length; i++) {
				try {
					should.exist(compilation.modules[i].portableId);
					compilation.modules[i].portableId.should.equal(identifierUtils.makePathsRelative(compiler.context, compilation.modules[i].identifier()));
				} catch(e) {
					done(e);
					pass = false;
					break;
				}
			}
			if(pass) done();
		});
	});
});
