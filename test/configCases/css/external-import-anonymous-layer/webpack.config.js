"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
const base = {
	target: "web",
	mode: "development",
	devtool: false,
	node: { __dirname: false, __filename: false },
	experiments: { css: true }
};

/** @type {Configuration[]} */
module.exports = [
	base,
	{
		...base,
		output: {
			hashFunction: "sha256",
			hashDigest: "base64",
			hashSalt: "salt"
		}
	}
];
