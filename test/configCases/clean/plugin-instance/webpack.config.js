"use strict";

const { CleanPlugin } = require("../../../../");

/** @import { Configuration } from "../../../../" */

// Unlike `output.clean`, a plugin instance validates its own options
/** @type {Configuration} */
module.exports = {
	plugins: [new CleanPlugin({ dry: true, keep: /keep/ })]
};
