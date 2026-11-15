"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	output: {
		// A text encoding of hash bytes can yield any character, so it is no digest.
		filename: "bundle0.[contenthash:latin1:4].js"
	}
};
