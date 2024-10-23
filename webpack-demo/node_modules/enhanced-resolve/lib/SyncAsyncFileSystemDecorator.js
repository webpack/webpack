/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Resolver").FileSystem} FileSystem */
/** @typedef {import("./Resolver").ReaddirStringCallback} ReaddirStringCallback */
/** @typedef {import("./Resolver").StringCallback} StringCallback */
/** @typedef {import("./Resolver").SyncFileSystem} SyncFileSystem */

/**
 * @param {SyncFileSystem} fs file system implementation
 * @constructor
 */
function SyncAsyncFileSystemDecorator(fs) {
	this.fs = fs;

	this.lstat = undefined;
	this.lstatSync = undefined;
	const lstatSync = fs.lstatSync;
	if (lstatSync) {
		this.lstat =
			/** @type {FileSystem["lstat"]} */
			(
				(arg, options, callback) => {
					let result;
					try {
						result = /** @type {Function | undefined} */ (callback)
							? lstatSync.call(fs, arg, options)
							: lstatSync.call(fs, arg);
					} catch (e) {
						return (callback || options)(
							/** @type {NodeJS.ErrnoException | null} */ (e)
						);
					}

					(callback || options)(null, /** @type {any} */ (result));
				}
			);
		this.lstatSync =
			/** @type {SyncFileSystem["lstatSync"]} */
			((arg, options) => lstatSync.call(fs, arg, options));
	}

	this.stat =
		/** @type {FileSystem["stat"]} */
		(
			(arg, options, callback) => {
				let result;
				try {
					result = /** @type {Function | undefined} */ (callback)
						? fs.statSync(arg, options)
						: fs.statSync(arg);
				} catch (e) {
					return (callback || options)(
						/** @type {NodeJS.ErrnoException | null} */ (e)
					);
				}

				(callback || options)(null, /** @type {any} */ (result));
			}
		);
	this.statSync =
		/** @type {SyncFileSystem["statSync"]} */
		((arg, options) => fs.statSync(arg, options));

	this.readdir =
		/** @type {FileSystem["readdir"]} */
		(
			(arg, options, callback) => {
				let result;
				try {
					result = /** @type {Function | undefined} */ (callback)
						? fs.readdirSync(
								arg,
								/** @type {Exclude<Parameters<FileSystem["readdir"]>[1], ReaddirStringCallback>} */
								(options)
						  )
						: fs.readdirSync(arg);
				} catch (e) {
					return (callback || options)(
						/** @type {NodeJS.ErrnoException | null} */ (e)
					);
				}

				(callback || options)(null, /** @type {any} */ (result));
			}
		);
	this.readdirSync =
		/** @type {SyncFileSystem["readdirSync"]} */
		(
			(arg, options) =>
				fs.readdirSync(
					arg,
					/** @type {Parameters<SyncFileSystem["readdirSync"]>[1]} */ (options)
				)
		);

	this.readFile =
		/** @type {FileSystem["readFile"]} */
		(
			(arg, options, callback) => {
				let result;
				try {
					result = /** @type {Function | undefined} */ (callback)
						? fs.readFileSync(arg, options)
						: fs.readFileSync(arg);
				} catch (e) {
					return (callback || options)(
						/** @type {NodeJS.ErrnoException | null} */ (e)
					);
				}

				(callback || options)(null, /** @type {any} */ (result));
			}
		);
	this.readFileSync =
		/** @type {SyncFileSystem["readFileSync"]} */
		((arg, options) => fs.readFileSync(arg, options));

	this.readlink =
		/** @type {FileSystem["readlink"]} */
		(
			(arg, options, callback) => {
				let result;
				try {
					result = /** @type {Function | undefined} */ (callback)
						? fs.readlinkSync(
								arg,
								/** @type {Exclude<Parameters<FileSystem["readlink"]>[1], StringCallback>} */
								(options)
						  )
						: fs.readlinkSync(arg);
				} catch (e) {
					return (callback || options)(
						/** @type {NodeJS.ErrnoException | null} */ (e)
					);
				}

				(callback || options)(null, /** @type {any} */ (result));
			}
		);
	this.readlinkSync =
		/** @type {SyncFileSystem["readlinkSync"]} */
		(
			(arg, options) =>
				fs.readlinkSync(
					arg,
					/** @type {Parameters<SyncFileSystem["readlinkSync"]>[1]} */ (options)
				)
		);

	this.readJson = undefined;
	this.readJsonSync = undefined;
	const readJsonSync = fs.readJsonSync;
	if (readJsonSync) {
		this.readJson =
			/** @type {FileSystem["readJson"]} */
			(
				(arg, callback) => {
					let result;
					try {
						result = readJsonSync.call(fs, arg);
					} catch (e) {
						return callback(
							/** @type {NodeJS.ErrnoException | Error | null} */ (e)
						);
					}

					callback(null, result);
				}
			);
		this.readJsonSync =
			/** @type {SyncFileSystem["readJsonSync"]} */
			(arg => readJsonSync.call(fs, arg));
	}

	this.realpath = undefined;
	this.realpathSync = undefined;
	const realpathSync = fs.realpathSync;
	if (realpathSync) {
		this.realpath =
			/** @type {FileSystem["realpath"]} */
			(
				(arg, options, callback) => {
					let result;
					try {
						result = /** @type {Function | undefined} */ (callback)
							? realpathSync.call(
									fs,
									arg,
									/** @type {Exclude<Parameters<NonNullable<FileSystem["realpath"]>>[1], StringCallback>} */
									(options)
							  )
							: realpathSync.call(fs, arg);
					} catch (e) {
						return (callback || options)(
							/** @type {NodeJS.ErrnoException | null} */ (e)
						);
					}

					(callback || options)(null, /** @type {any} */ (result));
				}
			);
		this.realpathSync =
			/** @type {SyncFileSystem["realpathSync"]} */
			(
				(arg, options) =>
					realpathSync.call(
						fs,
						arg,
						/** @type {Parameters<NonNullable<SyncFileSystem["realpathSync"]>>[1]} */
						(options)
					)
			);
	}
}
module.exports = SyncAsyncFileSystemDecorator;
