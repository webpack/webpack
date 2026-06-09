"use strict";

const { Volume, createFsFromVolume } = require("memfs");
const ContextModuleFactory = require("../lib/ContextModuleFactory");

/** @typedef {import("memfs").IFs} IFs */
/** @typedef {import("../lib/util/fs").InputFileSystem} InputFileSystem */
/** @typedef {import("../lib/ContextModule").ContextModuleOptions} ContextModuleOptions */

describe("ContextModuleFactory", () => {
	describe("resolveDependencies", () => {
		/** @type {ContextModuleFactory} */
		let factory;
		/** @type {IFs} */
		let memfs;

		beforeEach(() => {
			factory = new ContextModuleFactory(/** @type {EXPECTED_ANY} */ ([]));
			memfs = createFsFromVolume(new Volume());
		});

		it("should not report an error when ENOENT errors happen", (done) => {
			memfs.readdir = /** @type {IFs["readdir"]} */ (
				/** @type {unknown} */ (
					/**
					 * @param {string} _dir
					 * @param {(err: Error | null, result?: unknown) => void} callback
					 * @returns {void}
					 */
					(_dir, callback) => {
						setTimeout(() => callback(null, ["/file"]));
					}
				)
			);
			memfs.stat = /** @type {IFs["stat"]} */ (
				/** @type {unknown} */ (
					/**
					 * @param {string} _file
					 * @param {(err: NodeJS.ErrnoException | null, result?: unknown) => void} callback
					 * @returns {void}
					 */
					(_file, callback) => {
						const err = /** @type {NodeJS.ErrnoException} */ (
							new Error("fake ENOENT error")
						);
						err.code = "ENOENT";
						setTimeout(() => callback(err, null));
					}
				)
			);
			factory.resolveDependencies(
				/** @type {InputFileSystem} */ (/** @type {unknown} */ (memfs)),
				/** @type {ContextModuleOptions} */ (
					/** @type {unknown} */ ({
						resource: "/",
						recursive: true,
						regExp: /.*/
					})
				),
				(err, res) => {
					expect(err).toBeFalsy();
					expect(Array.isArray(res)).toBe(true);
					expect(res).toHaveLength(0);
					done();
				}
			);
		});

		it("should report an error when non-ENOENT errors happen", (done) => {
			memfs.readdir = /** @type {IFs["readdir"]} */ (
				/** @type {unknown} */ (
					/**
					 * @param {string} _dir
					 * @param {(err: Error | null, result?: unknown) => void} callback
					 * @returns {void}
					 */
					(_dir, callback) => {
						setTimeout(() => callback(null, ["/file"]));
					}
				)
			);
			memfs.stat = /** @type {IFs["stat"]} */ (
				/** @type {unknown} */ (
					/**
					 * @param {string} _file
					 * @param {(err: NodeJS.ErrnoException | null, result?: unknown) => void} callback
					 * @returns {void}
					 */
					(_file, callback) => {
						const err = /** @type {NodeJS.ErrnoException} */ (
							new Error("fake EACCES error")
						);
						err.code = "EACCES";
						setTimeout(() => callback(err, null));
					}
				)
			);
			factory.resolveDependencies(
				/** @type {InputFileSystem} */ (/** @type {unknown} */ (memfs)),
				/** @type {ContextModuleOptions} */ (
					/** @type {unknown} */ ({
						resource: "/",
						recursive: true,
						regExp: /.*/
					})
				),
				(err, res) => {
					expect(err).toBeInstanceOf(Error);
					expect(res).toBeFalsy();
					done();
				}
			);
		});

		it("should return callback with [] if circular symlinks exist", (done) => {
			let statDirStatus = 0;
			memfs.readdir = /** @type {IFs["readdir"]} */ (
				/** @type {unknown} */ (
					/**
					 * @param {string} _dir
					 * @param {(err: Error | null, result?: unknown) => void} callback
					 * @returns {void}
					 */
					(_dir, callback) => {
						statDirStatus++;
						setTimeout(() => callback(null, ["/A"]));
					}
				)
			);
			memfs.stat = /** @type {IFs["stat"]} */ (
				/** @type {unknown} */ (
					/**
					 * @param {string} _file
					 * @param {(err: Error | null, result?: unknown) => void} callback
					 * @returns {void}
					 */
					(_file, callback) => {
						const resolvedValue = {
							isDirectory: () => statDirStatus === 1,
							isFile: () => statDirStatus !== 1
						};
						setTimeout(() => callback(null, resolvedValue));
					}
				)
			);
			memfs.realpath = /** @type {IFs["realpath"]} */ (
				/** @type {unknown} */ (
					Object.assign(
						/**
						 * @param {string} dir
						 * @param {(err: Error | null, result?: unknown) => void} callback
						 * @returns {void}
						 */
						(dir, callback) => {
							const realPath = dir.split("/");
							setTimeout(() => callback(null, realPath[realPath.length - 1]));
						},
						{ native: undefined }
					)
				)
			);
			factory.resolveDependencies(
				/** @type {InputFileSystem} */ (/** @type {unknown} */ (memfs)),
				/** @type {ContextModuleOptions} */ (
					/** @type {unknown} */ ({
						resource: "/A",
						recursive: true,
						regExp: /.*/
					})
				),
				(err, res) => {
					expect(res).toStrictEqual([]);
					done();
				}
			);
		});

		it("should not return callback with [] if there are no circular symlinks", (done) => {
			let statDirStatus = 0;
			memfs.readdir = /** @type {IFs["readdir"]} */ (
				/** @type {unknown} */ (
					/**
					 * @param {string} _dir
					 * @param {(err: Error | null, result?: unknown) => void} callback
					 * @returns {void}
					 */
					(_dir, callback) => {
						statDirStatus++;
						setTimeout(() => callback(null, ["/B"]));
					}
				)
			);
			memfs.stat = /** @type {IFs["stat"]} */ (
				/** @type {unknown} */ (
					/**
					 * @param {string} _file
					 * @param {(err: Error | null, result?: unknown) => void} callback
					 * @returns {void}
					 */
					(_file, callback) => {
						const resolvedValue = {
							isDirectory: () => statDirStatus === 1,
							isFile: () => statDirStatus !== 1
						};
						setTimeout(() => callback(null, resolvedValue));
					}
				)
			);
			memfs.realpath = /** @type {IFs["realpath"]} */ (
				/** @type {unknown} */ (
					Object.assign(
						/**
						 * @param {string} dir
						 * @param {(err: Error | null, result?: unknown) => void} callback
						 * @returns {void}
						 */
						(dir, callback) => {
							const realPath = dir.split("/");
							setTimeout(() => callback(null, realPath[realPath.length - 1]));
						},
						{ native: undefined }
					)
				)
			);
			factory.resolveDependencies(
				/** @type {InputFileSystem} */ (/** @type {unknown} */ (memfs)),
				/** @type {ContextModuleOptions} */ (
					/** @type {unknown} */ ({
						resource: "/A",
						recursive: true,
						regExp: /.*/
					})
				),
				(err, res) => {
					expect(res).not.toStrictEqual([]);
					expect(Array.isArray(res)).toBe(true);
					expect(res).toHaveLength(1);
					done();
				}
			);
		});

		it("should resolve correctly several resources", (done) => {
			memfs.readdir = /** @type {IFs["readdir"]} */ (
				/** @type {unknown} */ (
					/**
					 * @param {string} dir
					 * @param {(err: Error | null, result?: unknown) => void} callback
					 * @returns {void}
					 */
					(dir, callback) => {
						if (dir === "/a") setTimeout(() => callback(null, ["/B"]));
						if (dir === "/b") setTimeout(() => callback(null, ["/A"]));
						if (dir === "/a/B") setTimeout(() => callback(null, ["a"]));
						if (dir === "/b/A") setTimeout(() => callback(null, ["b"]));
					}
				)
			);
			memfs.stat = /** @type {IFs["stat"]} */ (
				/** @type {unknown} */ (
					/**
					 * @param {string} file
					 * @param {(err: Error | null, result?: unknown) => void} callback
					 * @returns {void}
					 */
					(file, callback) => {
						const resolvedValue = {
							isDirectory: () => file !== "/a/B/a" && file !== "/b/A/b",
							isFile: () => file === "/a/B/a" || file === "/b/A/b"
						};
						setTimeout(() => callback(null, resolvedValue));
					}
				)
			);
			memfs.realpath = /** @type {IFs["realpath"]} */ (
				/** @type {unknown} */ (undefined)
			);
			factory.resolveDependencies(
				/** @type {InputFileSystem} */ (/** @type {unknown} */ (memfs)),
				/** @type {ContextModuleOptions} */ (
					/** @type {unknown} */ ({
						resource: ["/a", "/b"],
						resourceFragment: "#hash",
						resourceQuery: "?query",
						recursive: true,
						regExp: /.*/
					})
				),
				(err, res) => {
					expect(res).not.toStrictEqual([]);
					expect(Array.isArray(res)).toBe(true);
					expect(
						/** @type {NonNullable<typeof res>} */ (res).map((r) => r.request)
					).toEqual(["./B/a?query#hash", "./A/b?query#hash"]);
					expect(
						/** @type {NonNullable<typeof res>} */ (res).map((r) =>
							r.getContext()
						)
					).toEqual(["/a", "/b"]);
					expect(
						/** @type {NonNullable<typeof res>} */ (res).map(
							(r) => r.userRequest
						)
					).toEqual(["./B/a", "./A/b"]);
					done();
				}
			);
		});
	});
});
