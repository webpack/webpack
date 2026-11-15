"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		output: {
			hashFunction: require("xxhashjs").h32,
			hashDigest: "hex"
		}
	},
	{
		output: {
			hashFunction: require("xxhashjs").h32,
			hashDigest: "base64url"
		}
	},
	{
		output: {
			hashFunction: require("xxhashjs").h32,
			hashDigest: "base32"
		}
	},
	{
		output: {
			hashFunction: require("xxhashjs").h32,
			hashDigest: "hex"
		}
	}
];
