"use strict";

/** @import { ParserOptionsByModuleTypeKnown } from "../../../../" */

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.(png|svg|jpg)$/,
				type: "asset",
				/** @type {ParserOptionsByModuleTypeKnown['asset']} */
				parser: {
					dataUrlCondition: (source, { filename }) =>
						filename.includes("?foo=bar")
				}
			}
		]
	}
};
