/** @import { Configuration } from "../../.." */

/** @type {Configuration} */
export default {
	entry: "./index",
	module: {
		rules: [
			{
				test: /\.svg/,
				type: "asset/bytes"
			}
		]
	}
};
