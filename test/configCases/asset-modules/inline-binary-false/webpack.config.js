"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.svg$/,
				type: "asset/inline",
				generator: {
					// treat the asset as text so its source is a string, which
					// exercises encodeDataUri's non-binary branch
					binary: false,
					dataUrl: {
						encoding: false
					}
				}
			}
		]
	}
};
