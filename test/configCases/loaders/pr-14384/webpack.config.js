"use strict";

const PluginWithLoader = require("./PluginWithLoader");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	plugins: [new PluginWithLoader()]
};
