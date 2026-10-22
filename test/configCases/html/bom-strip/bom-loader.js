"use strict";

// A string a loader returns reaches the parser as is: no BOM is stripped on the way.
/** @type {import("../../../../").LoaderDefinition} */
module.exports = function bomLoader(source) {
	return `﻿${source}`;
};
