"use strict";

const supports = require("webassembly-feature");

module.exports = () =>
	// eslint-disable-next-line new-cap
	supports["JS-BigInt-integration"]();
