/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { remove } = require("../helpers/browserslistConfigPackages");
const { removeClaims } = require("../helpers/testParts");

module.exports = () => {
	removeClaims();

	return remove();
};
