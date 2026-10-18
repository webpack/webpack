"use strict";

const { CleanPlugin } = require("../../../../");

// Unlike `output.clean`, a plugin instance validates its own options
/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [new CleanPlugin({ dry: true, keep: /keep/ })]
};
