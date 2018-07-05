/* globals describe, it, beforeEach */
"use strict";

const MemoryFs = require("memory-fs");
const ContextModuleFactory = require("../lib/ContextModuleFactory");

describe("ContextModuleFactory", () => {
	describe("resolveDependencies", () => {
		let factory, memfs;
		beforeEach(() => {
			factory = new ContextModuleFactory([]);
			memfs = new MemoryFs();
		});
		it("should not report an error when ENOENT errors happen", done => {
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
					expect(err).toBeFalsy();
					expect(Array.isArray(res)).toBe(true);
					expect(res.length).toBe(0);
					done();
				}
			);
		});
		it("should report an error when non-ENOENT errors happen", done => {
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
					expect(err).toBeInstanceOf(Error);
					expect(res).toBeFalsy();
					done();
				}
			);
		});
	});
});
