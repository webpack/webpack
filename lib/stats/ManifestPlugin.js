/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Stats")} Stats */

const STAGE = 100;

/**
 * @param {Stats} stats stats
 * @returns {object} json
 */
function extractManifest(stats) {
	return stats.toJson({ preset: "manifest" });
}

class ManifestPlugin {
	/**
	 * @param {string} path path
	 */
	constructor(path) {
		/** @type {string} */
		this.path = path;
	}

	/**
	 * @param {Compiler} compiler compiler that provides stats
	 */
	apply(compiler) {
		if (!compiler.options.experiments.manifest) {
			throw new Error(
				"'manifest' is only allowed when 'experiments.manifest' is enabled"
			);
		}

		compiler.hooks.done.tapAsync(
			{
				stage: STAGE,
				name: "ManifestPlugin"
			},
			(stats, cb) => {
				const manifest = extractManifest(stats);
				compiler.outputFileSystem.writeFile(
					this.path,
					JSON.stringify(manifest),
					err => {
						if (!err) return cb();

						err.message = `Error during writing manifest. ${err.message}`;
						cb(err);
					}
				);
			}
		);
	}
}

ManifestPlugin.extractManifest = extractManifest;

module.exports = ManifestPlugin;
