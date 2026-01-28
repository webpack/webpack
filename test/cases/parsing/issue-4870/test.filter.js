"use strict";

const supportsIteratorDestructuring = require("../../../helpers/supportsIteratorDestructuring");
const supportsObjectDestructuring = require("../../../helpers/supportsObjectDestructuring");

module.exports = () =>
	supportsObjectDestructuring() && supportsIteratorDestructuring();
