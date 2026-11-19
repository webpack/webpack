/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { stop } = require("../configCases/asset-modules/http-url/server");
const { remove } = require("../helpers/browserslistConfigPackages");
const { removeClaims } = require("../helpers/testParts");

module.exports = () => {
	removeClaims();
	stop();

	return remove();
};
