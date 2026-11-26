"use strict";

const { CopyPlugin } = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	plugins: [new CopyPlugin({ patterns: ["static"] })]
};
