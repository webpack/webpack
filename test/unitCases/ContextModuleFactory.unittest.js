"use strict";

const { Volume, createFsFromVolume } = require("memfs");
const ContextModuleFactory = require("../../lib/context/ContextModuleFactory");

/** @import { IFs } from "memfs" */
/** @import { InputFileSystem } from "../../lib/fs/fs" */
/** @import { ContextModuleOptions } from "../../lib/context/ContextModule" */

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
					 * @param {string} _dir directory path
					 * @param {(err: Error | null, result?: unknown) => void} callback node callback
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
					 * @param {string} _file file path
					 * @param {(err: NodeJS.ErrnoException | null, result?: unknown) => void} callback node callback
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
					 * @param {string} _dir directory path
					 * @param {(err: Error | null, result?: unknown) => void} callback node callback
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
					 * @param {string} _file file path
					 * @param {(err: NodeJS.ErrnoException | null, result?: unknown) => void} callback node callback
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
					 * @param {string} _dir directory path
					 * @param {(err: Error | null, result?: unknown) => void} callback node callback
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
					 * @param {string} _file file path
					 * @param {(err: Error | null, result?: unknown) => void} callback node callback
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
						 * @param {string} dir directory path
						 * @param {(err: Error | null, result?: unknown) => void} callback node callback
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
					 * @param {string} _dir directory path
					 * @param {(err: Error | null, result?: unknown) => void} callback node callback
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
					 * @param {string} _file file path
					 * @param {(err: Error | null, result?: unknown) => void} callback node callback
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
						 * @param {string} dir directory path
						 * @param {(err: Error | null, result?: unknown) => void} callback node callback
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
	});
});
