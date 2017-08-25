/* global describe, it */
"use strict";

const should = require("should");

const fs = require("fs");
const path = require("path");
const webpack = require("../lib/webpack");
const nodeSourcePlugin = require("../lib/node/NodeSourcePlugin");
const Compiler = require("../lib/Compiler");

describe("NodeSourcePlugin", () => {

	it("should apply if node-libs-browser is present", (done) => {
		var plugin = new nodeSourcePlugin({});
		var compiler = new Compiler();
		plugin.apply(compiler);
		compiler._plugins.should.have.property("compilation");
		done();
	});

	it("should not apply if node-libs-browser is not present", (done) => {
		var nodeLibsBrowser = require.resolve("node-libs-browser");
		fs.rename(nodeLibsBrowser, nodeLibsBrowser + ".old", (err) => {
			should.not.exist(err);
			delete require.cache[nodeLibsBrowser];
			var plugin = new nodeSourcePlugin({});

			var compiler = new Compiler();
			plugin.apply(compiler);
			delete require.cache[nodeLibsBrowser];
			fs.rename(nodeLibsBrowser + ".old", nodeLibsBrowser, (err) => {
				should.not.exist(err);
				compiler._plugins.should.not.have.property("compilation");
				done();
			});
		});

	});

});
