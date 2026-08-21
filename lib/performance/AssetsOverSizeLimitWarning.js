/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/

"use strict";

const WebpackError = require("../errors/WebpackError");
const formatSize = require("../util/formatSize");

/** @import { AssetDetails } from "./SizeLimitsPlugin" */

class AssetsOverSizeLimitWarning extends WebpackError {
	/**
	 * Creates an instance of AssetsOverSizeLimitWarning.
	 * @param {AssetDetails[]} assetsOverSizeLimit the assets
	 * @param {number} assetLimit the size limit
	 */
	constructor(assetsOverSizeLimit, assetLimit) {
		const assetLists = assetsOverSizeLimit
			.map((asset) => {
				const largest = asset.modules
					? `\n    Largest modules: ${asset.modules
							.map((module) => `${module.name} (${formatSize(module.size)})`)
							.join(", ")}`
					: "";

				return `\n  ${asset.name} (${formatSize(asset.size)})${largest}`;
			})
			.join("");

		super(`asset size limit: The following asset(s) exceed the recommended size limit (${formatSize(
			assetLimit
		)}).
This can impact web performance.
Assets: ${assetLists}`);

		/** @type {string} */
		this.name = "AssetsOverSizeLimitWarning";
		/** @type {AssetDetails[]} */
		this.assets = assetsOverSizeLimit;
	}
}

/** @type {typeof AssetsOverSizeLimitWarning} */
module.exports = AssetsOverSizeLimitWarning;
