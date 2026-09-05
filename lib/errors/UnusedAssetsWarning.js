/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/**
 * @typedef {object} UnusedAssetDetails
 * @property {string} name the module, by request
 * @property {number} size the bytes its file adds to the output
 */

class UnusedAssetsWarning extends WebpackError {
	/**
	 * Creates an instance of UnusedAssetsWarning.
	 * @param {UnusedAssetDetails[]} assets the assets nothing reads
	 * @param {number} total the bytes they add between them
	 */
	constructor(assets, total) {
		const list = assets
			.map((it) => `\n  ${it.name} (${it.size} bytes)`)
			.join("");

		super(
			`unused assets: ${total} bytes are emitted for ${assets.length === 1 ? "an import whose binding" : "imports whose bindings"} nothing reads:${list}\nThe import brings the file into the output but its value is never used, so the bytes ship for nothing. Drop the import, or write it as 'import "./file"' with no binding where the file is wanted on disk regardless — 'experiments.futureDefaults' already leaves those alone and drops these.\nFor more info visit https://webpack.js.org/guides/asset-modules/`
		);

		/** @type {string} */
		this.name = "UnusedAssetsWarning";
	}
}

module.exports = UnusedAssetsWarning;
