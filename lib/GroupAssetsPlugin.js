/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author David Tanner @DavidTanner
*/

"use strict";

const path = require("path");
const { mkdirpAsync, copyFileAsync } = require("./util/fs");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./Stats")} Stats */
/** @typedef {import("./logging/Logger").Logger} Logger */
/** @typedef {import("./util/fs").OutputFileSystem} OutputFileSystem */

/** @typedef {Object.<string, string[]>} GroupAssetsResources */

/**
 * Process the stats to extract entrypoint resources
 * @param {Logger} logger The logger
 * @param {OutputFileSystem} fs filesystem
 * @param {Stats} stats Stats from the build
 * @returns {Promise<void>}
 */
const processStats = async (logger, fs, stats) => {
	const {
		compilation: {
			errors,
			entrypoints,
			outputOptions: { path: outputDir = process.cwd() }
		}
	} = stats;

	if (errors.length) {
		logger.warn("AssetsDirectoryPlugin: Not running because of errors");
		return;
	}

	/** @type {GroupAssetsResources} */
	const resources = {};
	for (const [name, entrypoint] of entrypoints) {
		const filesToCopy = [];
		entrypoint.chunks.forEach(({ files, auxiliaryFiles }) => {
			filesToCopy.push(...files);
			filesToCopy.push(...auxiliaryFiles);
		});
		resources[name] = filesToCopy;
	}

	await copyAssets(logger, fs, outputDir, resources);
};

/**
 * Copy the required assets to the directory
 * @param {Logger} logger The logger
 * @param {OutputFileSystem} fs filesystem
 * @param {String} outputDir The output directory
 * @param {GroupAssetsResources} resources The resources to be copied
 * @returns {Promise<void>}
 */
const copyAssets = async (logger, fs, outputDir, resources) => {
	await Promise.all(
		Object.entries(resources).map(async ([entryName, filesToCopy]) => {
			// Now, write a zip file for each entry
			logger.info(`Adding entries for ${entryName}...`);
			const outDir = path.join(outputDir, `${entryName}.dir`);
			await Promise.all(
				filesToCopy.map(async file => {
					const destDir = path.join(outDir, file);
					await mkdirpAsync(fs, path.dirname(destDir));
					await copyFileAsync(fs, path.join(outputDir, file), destDir);
				})
			);
			logger.info(`Finished adding entries for ${entryName}.`);
		})
	);
};

class GroupAssetsPlugin {
	constructor() {}
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		/** @type {Logger} */
		const logger = compiler.getInfrastructureLogger(
			"webpack.GroupAssetsPlugin"
		);
		const fs = compiler.outputFileSystem;
		compiler.hooks.done.tapPromise("GroupAssetsPlugin", stats =>
			processStats(logger, fs, stats)
		);
	}
}

module.exports = GroupAssetsPlugin;
