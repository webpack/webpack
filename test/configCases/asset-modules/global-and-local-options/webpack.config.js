"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	module: {
		parser: {
			asset: {
				dataUrlCondition() {
					return true;
				}
			}
		},
		rules: [
			{
				test: /file-global\.txt$/,
				type: "asset"
			},
			{
				test: /file-local\.txt$/,
				type: "asset",
				parser: {
					dataUrlCondition() {
						return false;
					}
				}
			}
		]
	}
};
