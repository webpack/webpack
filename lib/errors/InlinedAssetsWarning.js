/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

/**
 * @typedef {object} InlinedAssetDetails
 * @property {string} name the asset, by path
 * @property {number} size the bytes it adds to the JavaScript
 */

class InlinedAssetsWarning extends WebpackError {
	/**
	 * Creates an instance of InlinedAssetsWarning.
	 * @param {InlinedAssetDetails[]} assets the assets inlined as data urls
	 * @param {number} total the bytes they add between them
	 */
	constructor(assets, total) {
		const list = assets
			.map((it) => `\n  ${it.name} (${it.size} bytes)`)
			.join("");

		super(
			`inlined assets: ${total} bytes of asset data are embedded in the JavaScript:${list}\nA data url is base64, so it costs about a third more than the file it replaces, cannot be cached on its own, and is downloaded again whenever the code around it changes. 'Rule.parser.dataUrlCondition.maxSize' decides which files are small enough to be worth that.\nFor more info visit https://webpack.js.org/guides/asset-modules/#general-asset-type`
		);

		/** @type {string} */
		this.name = "InlinedAssetsWarning";
	}
}

module.exports = InlinedAssetsWarning;
