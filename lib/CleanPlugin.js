/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const asyncLib = require("neo-async");
const { SyncBailHook } = require("tapable");
const Compilation = require("../lib/Compilation");
const createSchemaValidation = require("./util/create-schema-validation");
const { join } = require("./util/fs");
const processAsyncTree = require("./util/processAsyncTree");

/** @typedef {import("../declarations/WebpackOptions").CleanOptions} CleanOptions */
/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./logging/Logger").Logger} Logger */
/** @typedef {import("./util/fs").OutputFileSystem} OutputFileSystem */
/** @typedef {import("./util/fs").StatsCallback} StatsCallback */

/** @typedef {(function(string):boolean)|RegExp} IgnoreItem */
/** @typedef {function(IgnoreItem): void} AddToIgnoreCallback */

/**
 * @typedef {Object} CleanPluginCompilationHooks
 * @property {SyncBailHook<[string], boolean>} keep when returning true the file/directory will be kept during cleaning, returning false will clean it and ignore the following plugins and config
 */

const validate = createSchemaValidation(
	undefined,
	() => {
		const { definitions } = require("../schemas/WebpackOptions.json");
		return {
			definitions,
			oneOf: [{ $ref: "#/definitions/CleanOptions" }]
		};
	},
	{
		name: "Clean Plugin",
		baseDataPath: "options"
	}
);

/**
 * @param {OutputFileSystem} fs filesystem
 * @param {string} outputPath output path
 * @param {Set<string>} currentAssets filename of the current assets (must not start with .. or ., must only use / as path separator)
 * @param {function(Error=, Set<string>=): void} callback returns the filenames of the assets that shouldn't be there
 * @returns {void}
 */
const getDiffToFs = (fs, outputPath, currentAssets, callback) => {
	const directories = new Set();
	// get directories of assets
	for (const asset of currentAssets) {
		directories.add(asset.replace(/(^|\/)[^/]*$/, ""));
	}
	// and all parent directories
	for (const directory of directories) {
		directories.add(directory.replace(/(^|\/)[^/]*$/, ""));
	}
	const diff = new Set();
	asyncLib.forEachLimit(
		directories,
		10,
		(directory, callback) => {
			fs.readdir(join(fs, outputPath, directory), (err, entries) => {
				if (err) {
					if (err.code === "ENOENT") return callback();
					if (err.code === "ENOTDIR") {
						diff.add(directory);
						return callback();
					}
					return callback(err);
				}
				for (const entry of entries) {
					const file = /** @type {string} */ (entry);
					const filename = directory ? `${directory}/${file}` : file;
					if (!directories.has(filename) && !currentAssets.has(filename)) {
						diff.add(filename);
					}
				}
				callback();
			});
		},
		err => {
			if (err) return callback(err);

			callback(null, diff);
		}
	);
};

/**
 * @param {Set<string>} currentAssets assets list
 * @param {Set<string>} oldAssets old assets list
 * @returns {Set<string>} diff
 */
const getDiffToOldAssets = (currentAssets, oldAssets) => {
	const diff = new Set();
	for (const asset of oldAssets) {
		if (!currentAssets.has(asset)) diff.add(asset);
	}
	return diff;
};

/**
 * @param {OutputFileSystem} fs filesystem
 * @param {string} filename path to file
 * @param {StatsCallback} callback callback for provided filename
 * @returns {void}
 */
const doStat = (fs, filename, callback) => {
	if ("lstat" in fs) {
		fs.lstat(filename, callback);
	} else {
		fs.stat(filename, callback);
	}
};

/**
 * @param {OutputFileSystem} fs filesystem
 * @param {string} outputPath output path
 * @param {boolean} dry only log instead of fs modification
 * @param {Logger} logger logger
 * @param {Set<string>} diff filenames of the assets that shouldn't be there
 * @param {function(string): boolean} isKept check if the entry is ignored
 * @param {function(Error=): void} callback callback
 * @returns {void}
 */
const applyDiff = (fs, outputPath, dry, logger, diff, isKept, callback) => {
	const log = msg => {
		if (dry) {
			logger.info(msg);
		} else {
			logger.log(msg);
		}
	};
	/** @typedef {{ type: "check" | "unlink" | "rmdir", filename: string, parent: { remaining: number, job: Job } | undefined }} Job */
	/** @type {Job[]} */
	const jobs = Array.from(diff, filename => ({
		type: "check",
		filename,
		parent: undefined
	}));
	processAsyncTree(
		jobs,
		10,
		({ type, filename, parent }, push, callback) => {
			const handleError = err => {
				if (err.code === "ENOENT") {
					log(`${filename} was removed during cleaning by something else`);
					handleParent();
					return callback();
				}
				return callback(err);
			};
			const handleParent = () => {
				if (parent && --parent.remaining === 0) push(parent.job);
			};
			const path = join(fs, outputPath, filename);
			switch (type) {
				case "check":
					if (isKept(filename)) {
						// do not decrement parent entry as we don't want to delete the parent
						log(`${filename} will be kept`);
						return process.nextTick(callback);
					}
					doStat(fs, path, (err, stats) => {
						if (err) return handleError(err);
						if (!stats.isDirectory()) {
							push({
								type: "unlink",
								filename,
								parent
							});
							return callback();
						}
						fs.readdir(path, (err, entries) => {
							if (err) return handleError(err);
							/** @type {Job} */
							const deleteJob = {
								type: "rmdir",
								filename,
								parent
							};
							if (entries.length === 0) {
								push(deleteJob);
							} else {
								const parentToken = {
									remaining: entries.length,
									job: deleteJob
								};
								for (const entry of entries) {
									const file = /** @type {string} */ (entry);
									if (file.startsWith(".")) {
										log(
											`${filename} will be kept (dot-files will never be removed)`
										);
										continue;
									}
									push({
										type: "check",
										filename: `${filename}/${file}`,
										parent: parentToken
									});
								}
							}
							return callback();
						});
					});
					break;
				case "rmdir":
					log(`${filename} will be removed`);
					if (dry) {
						handleParent();
						return process.nextTick(callback);
					}
					if (!fs.rmdir) {
						logger.warn(
							`${filename} can't be removed because output file system doesn't support removing directories (rmdir)`
						);
						return process.nextTick(callback);
					}
					fs.rmdir(path, err => {
						if (err) return handleError(err);
						handleParent();
						callback();
					});
					break;
				case "unlink":
					log(`${filename} will be removed`);
					if (dry) {
						handleParent();
						return process.nextTick(callback);
					}
					if (!fs.unlink) {
						logger.warn(
							`${filename} can't be removed because output file system doesn't support removing files (rmdir)`
						);
						return process.nextTick(callback);
					}
					fs.unlink(path, err => {
						if (err) return handleError(err);
						handleParent();
						callback();
					});
					break;
			}
		},
		callback
	);
};

/** @type {WeakMap<Compilation, CleanPluginCompilationHooks>} */
const compilationHooksMap = new WeakMap();

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
				/** @type {SyncBailHook<[string], boolean>} */
				keep: new SyncBailHook(["ignore"])
			};
			compilationHooksMap.set(compilation, hooks);
		}
		return hooks;
	}

	/** @param {CleanOptions} options options */
	constructor(options = {}) {
		validate(options);
		this.options = { dry: false, ...options };
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const { dry, keep } = this.options;

		const keepFn =
			typeof keep === "function"
				? keep
				: typeof keep === "string"
				? path => path.startsWith(keep)
				: typeof keep === "object" && keep.test
				? path => keep.test(path)
				: () => false;

		// We assume that no external modification happens while the compiler is active
		// So we can store the old assets and only diff to them to avoid fs access on
		// incremental builds
		let oldAssets;

		compiler.hooks.emit.tapAsync(
			{
				name: "CleanPlugin",
				stage: 100
			},
			(compilation, callback) => {
				const hooks = CleanPlugin.getCompilationHooks(compilation);
				const logger = compilation.getLogger("webpack.CleanPlugin");
				const fs = compiler.outputFileSystem;

				if (!fs.readdir) {
					return callback(
						new Error(
							"CleanPlugin: Output filesystem doesn't support listing directories (readdir)"
						)
					);
				}

				const currentAssets = new Set();
				for (const asset of Object.keys(compilation.assets)) {
					if (/^[A-Za-z]:\\|^\/|^\\\\/.test(asset)) continue;
					let normalizedAsset;
					let newNormalizedAsset = asset.replace(/\\/g, "/");
					do {
						normalizedAsset = newNormalizedAsset;
						newNormalizedAsset = normalizedAsset.replace(
							/(^|\/)(?!\.\.)[^/]+\/\.\.\//g,
							"$1"
						);
					} while (newNormalizedAsset !== normalizedAsset);
					if (normalizedAsset.startsWith("../")) continue;
					currentAssets.add(normalizedAsset);
				}

				const outputPath = compilation.getPath(compiler.outputPath, {});

				const isKept = path => {
					const result = hooks.keep.call(path);
					if (result !== undefined) return result;
					return keepFn(path);
				};

				const diffCallback = (err, diff) => {
					if (err) {
						oldAssets = undefined;
						return callback(err);
					}
					applyDiff(fs, outputPath, dry, logger, diff, isKept, err => {
						if (err) {
							oldAssets = undefined;
						} else {
							oldAssets = currentAssets;
						}
						callback(err);
					});
				};

				if (oldAssets) {
					diffCallback(null, getDiffToOldAssets(currentAssets, oldAssets));
				} else {
					getDiffToFs(fs, outputPath, currentAssets, diffCallback);
				}
			}
		);
	}
}

module.exports = CleanPlugin;
