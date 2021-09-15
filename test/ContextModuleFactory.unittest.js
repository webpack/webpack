"use strict";

const { createFsFromVolume, Volume } = require("memfs");
const ContextModuleFactory = require("../lib/ContextModuleFactory");

describe("ContextModuleFactory", () => {
	describe("resolveDependencies", () => {
		let factory, memfs;
		beforeEach(() => {
			factory = new ContextModuleFactory([]);
			memfs = createFsFromVolume(new Volume());
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
		it("should return callback with [] if circular symlinks exist", done => {
			let statDirStatus = 0;
			memfs.readdir = (dir, callback) => {
				statDirStatus++;
				setTimeout(() => callback(null, ["/A"]));
			};
			memfs.stat = (file, callback) => {
				const resolvedValue = {
					isDirectory: () => statDirStatus === 1,
					isFile: () => statDirStatus !== 1
				};
				setTimeout(() => callback(null, resolvedValue));
			};
			memfs.realpath = (dir, callback) => {
				const realPath = dir.split("/");
				setTimeout(() => callback(null, realPath[realPath.length - 1]));
			};
			factory.resolveDependencies(
				memfs,
				{
					resource: "/A",
					recursive: true,
					regExp: /.*/
				},
				(err, res) => {
					expect(res).toStrictEqual([]);
					done();
				}
			);
		});
		it("should not return callback with [] if there are no circular symlinks", done => {
			let statDirStatus = 0;
			memfs.readdir = (dir, callback) => {
				statDirStatus++;
				setTimeout(() => callback(null, ["/B"]));
			};
			memfs.stat = (file, callback) => {
				const resolvedValue = {
					isDirectory: () => statDirStatus === 1,
					isFile: () => statDirStatus !== 1
				};
				setTimeout(() => callback(null, resolvedValue));
			};
			memfs.realpath = (dir, callback) => {
				const realPath = dir.split("/");
				setTimeout(() => callback(null, realPath[realPath.length - 1]));
			};
			factory.resolveDependencies(
				memfs,
				{
					resource: "/A",
					recursive: true,
					regExp: /.*/
				},
				(err, res) => {
					expect(res).not.toStrictEqual([]);
					expect(Array.isArray(res)).toBe(true);
					expect(res.length).toBe(1);
					done();
				}
			);
		});
	});
});
