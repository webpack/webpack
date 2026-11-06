"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{ test: /value\.js$/, generator: { binary: true } },
			{ test: /\.txt$/, type: "asset/source", generator: { encoding: "utf8" } },
			{ test: /\.bin$/, type: "asset/bytes", generator: { binary: false } }
		]
	}
};
