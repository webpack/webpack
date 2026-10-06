"use strict";

const { Compilation } = require("../../../../");

/** @typedef {NonNullable<import("../../../../").Compiler["inputFileSystem"]>} InputFileSystem */
/** @typedef {import("../../../../").Configuration} Configuration */

const PLUGIN_NAME = "ReplaceLstatPlugin";

/**
 * Hands the copy plugin an input file system whose `lstat` is replaced, then
 * puts the real one back before anything is emitted.
 */
class ReplaceLstatPlugin {
	/**
	 * @param {InputFileSystem["lstat"]} lstat what stands in for `lstat`
	 */
	constructor(lstat) {
		this.lstat = lstat;
	}

	/**
	 * @param {import("../../../../").Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			const original = /** @type {InputFileSystem} */ (
				compiler.inputFileSystem
			);
			compilation.hooks.processAssets.tap(
				{
					name: PLUGIN_NAME,
					stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL - 1
				},
				() => {
					compiler.inputFileSystem = Object.create(original, {
						lstat: { value: this.lstat }
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

/**
 * @param {string} target path to stat
 * @param {(err: NodeJS.ErrnoException) => void} callback callback
 * @returns {void}
 */
const failingLstat = (target, callback) => {
	/** @type {NodeJS.ErrnoException} */
	const error = new Error(`EIO: i/o error, lstat '${target}'`);
	error.code = "EIO";
	callback(error);
};

/** @type {Configuration[]} */
module.exports = [
	{
		entry: "./without-lstat.js",
		output: {
			copy: [
				{
					from: "files/a.txt",
					to: "without-lstat",
					globOptions: { followSymlinks: false }
				}
			]
		},
		// a file system without it can only say what a link points at
		plugins: [new ReplaceLstatPlugin(undefined)]
	},
	{
		entry: "./failing-lstat.js",
		output: {
			copy: [
				{
					from: "files/a.txt",
					to: "failing-lstat",
					globOptions: { followSymlinks: false }
				}
			]
		},
		plugins: [
			new ReplaceLstatPlugin(
				/** @type {InputFileSystem["lstat"]} */ (
					/** @type {unknown} */ (failingLstat)
				)
			)
		]
	}
];
