"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Sean Larkin @thelarkinn
 */
const SizeFormatHelpers = require("../SizeFormatHelpers");
class AssetsOverSizeLimitWarning extends Error {
	constructor(assetsOverSizeLimit, assetLimit) {
		super();
		Error.captureStackTrace(this, AssetsOverSizeLimitWarning);
		this.name = "AssetsOverSizeLimitWarning";
		this.assets = assetsOverSizeLimit;
		const assetLists = this.assets.map(asset => `\n  ${asset.name} (${SizeFormatHelpers.formatSize(asset.size)})`)
			.join("");
		this.message = `asset size limit: The following asset(s) exceed the recommended size limit (${SizeFormatHelpers.formatSize(assetLimit)}). \nThis can impact web performance.\nAssets: ${assetLists}`;
	}
}
module.exports = AssetsOverSizeLimitWarning;
