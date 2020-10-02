/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const path = require("path");
const validateOptions = require("schema-utils");
const { SyncHook } = require("tapable");
const Compilation = require("../lib/Compilation");
const schema = require("../schemas/plugins/CleanPlugin.json");

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
 * @param {import("./util/fs").OutputFileSystem} outputFS output fs
 * @param {string} from from directory
 * @returns {{files: Array<string>, directories: Array<string>}} collected files and directories
 */
function readDir(outputFS, from) {
	const collectedFiles = [];
	const collectedDirectories = [];
	const stack = [from];
	let cursor;

	while ((cursor = stack.pop())) {
		const stat = outputFS.statSync(cursor);

		if (stat.isDirectory()) {
			const items = outputFS.readdirSync(cursor);

			if (from !== cursor) {
				const relative = path.relative(from, cursor);
				collectedDirectories.push(relative);
			}

			for (let i = 0; i < items.length; i++) {
				stack.push(path.join(cursor, items[i]));
			}
		} else {
			const relative = path.relative(from, cursor);
			collectedFiles.push(relative);
		}
	}

	return {
		files: collectedFiles,
		directories: collectedDirectories
	};
}

/**
 * @param {import("./util/fs").OutputFileSystem} outputFS output fs
 * @param {string} directory from directory
 */
const deleteFolderRecursive = (outputFS, directory) => {
	// webpack supports node 10, but node 10 does not support fs.rmdir recursive option
	if (!outputFS.existsSync(directory)) {
		return;
	}

	for (const item of outputFS.readdirSync(directory)) {
		const curPath = path.join(directory, item);

		if (outputFS.statSync(curPath).isDirectory()) {
			deleteFolderRecursive(outputFS, curPath);
		} else {
			outputFS.unlinkSync(curPath);
		}
	}

	outputFS.rmdirSync(directory);
};

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

	/**
	 * @param {CleanPluginArgument} [options] options
	 */
	constructor(options) {
		this.options = Object.assign({ enabled: true, dry: false }, options || {});

		if (options && typeof options === "object") {
			validateOptions(schema, options, {
				name: "Clean Plugin",
				baseDataPath: "options"
			});
		}

		/**
		 * @type {IgnoreItem[]}
		 */
		this.ignoreList = [];

		if (this.options.ignore) {
			this.ignoreList.push(this.options.ignore);
		}
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		let emittedOnce = false;
		let outputPath;
		const logger = compiler.getInfrastructureLogger("webpack.Clean");
		const handleDir = directory => {
			if (this.options.dry) {
				logger.info(`Directory [${directory}] will be removed in non-dry mode`);
			} else {
				const abs = path.join(outputPath, directory);
				deleteFolderRecursive(compiler.outputFileSystem, abs);
			}
		};
		const handleFile = file => {
			if (this.options.dry) {
				logger.info(`Asset [${file}] will be removed in non-dry mode`);
			} else {
				const abs = path.join(outputPath, file);
				if (compiler.outputFileSystem.existsSync(abs)) {
					compiler.outputFileSystem.unlinkSync(abs);
				}
			}
		};

		// do it before emitting for not to iterate many files
		compiler.hooks.emit.tap(
			{
				name: "CleanPlugin",
				stage: 100
			},
			compilation => {
				if (emittedOnce) {
					return;
				}

				outputPath = compilation.getPath(compiler.outputPath, {});

				if (
					!compiler.outputFileSystem ||
					!compiler.outputFileSystem.existsSync(outputPath)
				) {
					return;
				}

				/**
				 * @param {IgnoreItem} item regexp or function
				 * @returns {void}
				 */
				const ignoreFn = item => void this.ignoreList.push(item);
				CleanPlugin.getCompilationHooks(compilation).ignore.call(ignoreFn);

				const assetsDirectories = new Set();
				const handleAsset = asset => {
					const parts = asset.split(path.sep).slice(0, -1);

					parts.reduce((all, part) => {
						const directory = path.join(all, part);
						assetsDirectories.add(directory);
						return directory;
					}, "");
				};

				for (const asset in compilation.assets) {
					handleAsset(asset);
				}

				const collected = readDir(compiler.outputFileSystem, outputPath);

				for (const file of collected.files) {
					if (file in compilation.assets) {
						continue;
					}

					if (this.ignoreList.some(ignore => checkToIgnore(ignore, file))) {
						handleAsset(file);

						if (this.options.dry) {
							logger.info(`Asset [${file}] was ignored`);
						}
					} else {
						handleFile(file);
					}
				}

				for (const directory of collected.directories) {
					if (!assetsDirectories.has(directory)) {
						handleDir(directory);
					}
				}

				emittedOnce = true;
			}
		);
	}
}

module.exports = CleanPlugin;
