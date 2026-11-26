"use strict";

const { DefinePlugin } = require("../../../../");

/** @import { Configuration } from "../../../../" */

// null-prototype object to cover plain-object detection without a constructor
const env = Object.create(null);

env.REQUIRE_TYPE = "typeof __webpack_require__";

/** @type {Configuration} */
module.exports = {
	plugins: [
		new DefinePlugin({
			"import.meta.env": env
		})
	]
};
