/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/
"use strict";
const SizeFormatHelpers = require("../SizeFormatHelpers");

module.exports = class AssetsOverSizeLimitWarning extends Error {
	constructor(assetsOverSizeLimit, assetLimit) {
		super();
		Error.captureStackTrace(this, this.constructor);
		this.name = "AssetsOverSizeLimitWarning";
		this.assets = assetsOverSizeLimit;
		const assetLists = this.assets.map(asset => `\n  ${asset.name} (${SizeFormatHelpers.formatSize(asset.size)})`).join("");
		this.message = `asset size limit: The following asset(s) exceed the recommended size limit (${SizeFormatHelpers.formatSize(assetLimit)}).
This can impact web performance.
Assets: ${assetLists}`;
	}
};
