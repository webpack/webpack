"use strict";

const should = require("should");
const sinon = require("sinon");
const CachePlugin = require("../lib/CachePlugin");
const applyPluginWithOptions = require("./helpers/applyPluginWithOptions");

describe("CachePlugin", () => {
	let env;

	beforeEach(() => {
		env = {
			compilation: {
				compiler: {},
				warnings: []
			}
		};
	});

	it("has apply ", () => {
		(new CachePlugin()).apply.should.be.a.Function();
	});
	describe("applyMtime", () => {
		beforeEach(() => env.plugin = new CachePlugin());

		it("sets file system accuracy to 1 for granular modification timestamp", () => {
			env.plugin.applyMtime(1483819067001);
			env.plugin.FS_ACCURENCY.should.be.exactly(1);
		});

		it("sets file system accuracy to 10 for moderately granular modification timestamp", () => {
			env.plugin.applyMtime(1483819067004);
			env.plugin.FS_ACCURENCY.should.be.exactly(10);
		});

		it("sets file system accuracy to 100 for moderately coarse modification timestamp", () => {
			env.plugin.applyMtime(1483819067040);
			env.plugin.FS_ACCURENCY.should.be.exactly(100);
		});

		it("sets file system accuracy to 1000 for coarse modification timestamp", () => {
			env.plugin.applyMtime(1483819067400);
			env.plugin.FS_ACCURENCY.should.be.exactly(1000);
		});
	});
});
