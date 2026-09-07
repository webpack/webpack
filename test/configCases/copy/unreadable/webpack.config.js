"use strict";

const { Compilation } = require("../../../../");

/** @typedef {NonNullable<import("../../../../").Compiler["inputFileSystem"]>} InputFileSystem */
/** @typedef {import("../../../../lib/util/fs").StatsCallback} StatsCallback */
/** @typedef {import("../../../../lib/util/fs").ReaddirDirentCallback} ReaddirDirentCallback */

const PLUGIN_NAME = "DenyReadingPlugin";

/**
 * @param {string} operation name of the denied operation
 * @param {string} target what could not be read
 * @returns {NodeJS.ErrnoException} the error a file system raises for a path it may not read
 */
const denied = (operation, target) => {
	/** @type {NodeJS.ErrnoException} */
	const error = new Error(
		`EACCES: permission denied, ${operation} '${target}'`
	);
	error.code = "EACCES";
	return error;
};

/**
 * Hands the copy plugin an input file system which denies two paths and offers
 * no `realpath`, then puts the real one back before anything is emitted.
 */
class DenyReadingPlugin {
	/**
	 * @param {import("../../../../").Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			const original = /** @type {InputFileSystem} */ (
				compiler.inputFileSystem
			);

			/**
			 * @param {string} filePath path to stat
			 * @param {StatsCallback} callback callback
			 * @returns {void}
			 */
			const stat = (filePath, callback) => {
				if (filePath.includes("denied.txt")) {
					callback(denied("stat", "denied.txt"));
					return;
				}
				original.stat(filePath, callback);
			};

			/**
			 * @param {string} directory path to read
			 * @param {{ withFileTypes: true }} options options the walk reads types with
			 * @param {ReaddirDirentCallback} callback callback
			 * @returns {void}
			 */
			const readdir = (directory, options, callback) => {
				if (directory.includes("denied-dir")) {
					callback(denied("scandir", "denied-dir"));
					return;
				}
				original.readdir(directory, options, callback);
			};

			compilation.hooks.processAssets.tap(
				{
					name: PLUGIN_NAME,
					stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL - 1
				},
				() => {
					compiler.inputFileSystem = Object.create(original, {
						realpath: { value: undefined },
						stat: { value: stat },
						readdir: { value: readdir }
					});
				}
			);
			compilation.hooks.processAssets.tap(
				{ name: PLUGIN_NAME, stage: Compilation.PROCESS_ASSETS_STAGE_REPORT },
				() => {
					compiler.inputFileSystem = original;
				}
			);
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		copy: [
			{ from: "files/denied.txt" },
			{ from: "denied-dir/*.txt" },
			{ from: "files" }
		]
	},
	plugins: [new DenyReadingPlugin()]
};
