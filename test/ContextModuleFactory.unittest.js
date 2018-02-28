/* globals describe, it, beforeEach */
"use strict";
require("should");
const MemoryFs = require("memory-fs");
const ContextModuleFactory = require("../lib/ContextModuleFactory");

describe("ContextModuleFactory", function() {
	describe("resolveDependencies", function() {
		let factory, memfs;
		beforeEach(function() {
			factory = new ContextModuleFactory([]);
			memfs = new MemoryFs();
		});
		it("should not report an error when ENOENT errors happen", function(done) {
			memfs.readdir = (dir, callback) => {
				setTimeout(() => callback(null, ["/file"]));
			};
			memfs.stat = (file, callback) => {
				let err = new Error("fake ENOENT error");
				err.code = "ENOENT";
				setTimeout(() => callback(err, null));
			};
			factory.resolveDependencies(
				memfs,
				{
					resource: "/",
					recursive: true,
					regExp: /.*/
				},
				(err, res) => {
					(!!err).should.be.false();
					res.should.be.an.Array();
					res.length.should.be.exactly(0);
					done();
				}
			);
		});
		it("should report an error when non-ENOENT errors happen", function(done) {
			memfs.readdir = (dir, callback) => {
				setTimeout(() => callback(null, ["/file"]));
			};
			memfs.stat = (file, callback) => {
				let err = new Error("fake EACCES error");
				err.code = "EACCES";
				setTimeout(() => callback(err, null));
			};
			factory.resolveDependencies(
				memfs,
				{
					resource: "/",
					recursive: true,
					regExp: /.*/
				},
				(err, res) => {
					err.should.be.an.Error();
					(!!res).should.be.false();
					done();
				}
			);
		});
	});
});
