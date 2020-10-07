/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const asyncLib = require("neo-async");
const path = require("path");
const { validate } = require("schema-utils");
const { SyncHook } = require("tapable");
const Compilation = require("../lib/Compilation");
const schema = require("../schemas/plugins/CleanPlugin.json");
const { join } = require("./util/fs");

/** @typedef {import("../declarations/plugins/CleanPlugin").CleanPluginArgument} CleanPluginArgument */
/** @typedef {import("./Compiler")} Compiler */

/** @typedef {(function(string):boolean)|RegExp} IgnoreItem */
/** @typedef {function(IgnoreItem): void} AddToIgnoreCallback */

/**
 * @typedef {Object} CleanPluginCompilationHooks
 * @property {SyncHook<[AddToIgnoreCallback]>} ignore
 */

/** @type {WeakMap<Compilation, CleanPluginCompilationHooks>} */
const compilationHooksMap = new WeakMap();

/**
 * @param {IgnoreItem} ignore regexp or function
 * @param {string} asset asset path
 * @returns {boolean} true if an asset should be ignored
 */
const checkToIgnore = (ignore, asset) => {
	if (ignore instanceof RegExp) {
		return !!ignore.exec(asset);
	}

	return ignore(asset);
};

class CleanPlugin {
	/**
	 * @param {Compilation} compilation the compilation
	 * @returns {CleanPluginCompilationHooks} the attached hooks
	 */
	static getCompilationHooks(compilation) {
		if (!(compilation instanceof Compilation)) {
			throw new TypeError(
				"The 'compilation' argument must be an instance of Compilation"
			);
		}
		let hooks = compilationHooksMap.get(compilation);
		if (hooks === undefined) {
			hooks = {
				/** @type {SyncHook<[AddToIgnoreCallback]>} */
				ignore: new SyncHook(["ignore"])
			};
			compilationHooksMap.set(compilation, hooks);
		}
		return hooks;
	}

	/** @param {CleanPluginArgument} [options] options */
	constructor(options = {}) {
		this.options = { dry: false, ...options };

		if (options && typeof options === "object") {
			validate(schema, options, {
				name: "Clean Plugin",
				baseDataPath: "options"
			});
		}

		/** @type {IgnoreItem[]} */
		this.ignoreList = [];

		/** @type {import("./logging/Logger").Logger} */
		this.logger = null;

		/** @type {import("./util/fs").OutputFileSystem} */
		this.fs = null;

		/** @type {{files: Set<string>, directories: Set<string>}} */
		this.fsState = {
			files: new Set(),
			directories: new Set()
		};

		if (this.options.ignore) {
			this.ignoreList.push(this.options.ignore);
		}
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		/**
		 * @param {IgnoreItem} item regexp or function
		 * @returns {void}
		 */
		const ignoreFn = item => void this.ignoreList.push(item);
		const handleAsset = asset => {
			const parts = asset.split(/[\\/]+/).slice(0, -1);

			this.fsState.files.add(asset);
			parts.reduce((all, part) => {
				const directory = path.join(all, part);
				this.fsState.directories.add(directory);
				return directory;
			}, "");
		};
		this.logger = compiler.getInfrastructureLogger("webpack.Clean");
		this.fs = compiler.outputFileSystem;

		compiler.hooks.emit.tapAsync(
			{
				name: "CleanPlugin",
				stage: 100
			},
			(compilation, callback) => {
				this.resetFSState();

				CleanPlugin.getCompilationHooks(compilation).ignore.call(ignoreFn);

				for (const asset in compilation.assets) {
					if (asset.startsWith("..")) {
						continue;
					}

					handleAsset(asset);
				}

				const outputPath = compilation.getPath(compiler.outputPath, {});
				this.cleanRecursive(outputPath, callback);
			}
		);
	}

	resetFSState() {
		this.fsState.files.clear();
		this.fsState.directories.clear();
	}

	/**
	 * @param {string} p an absolute path
	 * @param {import("./util/fs").Callback} callback callback
	 * @returns {void}
	 */
	cleanRecursive(p, callback) {
		const handleError = (err, callback) => {
			if (!err) {
				return callback();
			}

			if (err.code === "ENOENT" || err.code === "ENOTEMPTY") {
				return callback();
			}
			return callback(err);
		};

		this.fs.readdir(p, (err, items) => {
			if (err) {
				return handleError(err, callback);
			}

			asyncLib.forEach(
				items,
				(item, callback) => {
					const child = join(this.fs, p, item);

					if (this.ignoreList.some(ignore => checkToIgnore(ignore, child))) {
						if (this.options.dry) {
							this.logger.info(`[${child}] will be ignored in non-dry mode`);
						}

						return callback();
					}

					this.fs.stat(child, (err, stat) => {
						if (err) {
							return handleError(err, callback);
						}

						if (stat.isFile()) {
							if (this.fsState.files.has(child)) {
								if (this.options.dry) {
									this.logger.info(
										`[${child}] will be ignored in non-dry mode`
									);
								}

								return callback();
							}

							if (this.options.dry) {
								this.logger.info(`[${child}] will be removed in non-dry mode`);
								return callback();
							} else {
								return this.fs.unlink(child, callback);
							}
						}

						if (stat.isDirectory()) {
							return this.cleanRecursive(child, callback);
						}

						callback();
					});
				},
				err => {
					if (err) {
						return handleError(err, callback);
					}

					this.fs.rmdir(p, err => handleError(err, callback));
				}
			);
		});
	}
}

module.exports = CleanPlugin;
