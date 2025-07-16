"use strict";

const PluginWithLoader = require("./PluginWithLoader");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [new PluginWithLoader()]
};
