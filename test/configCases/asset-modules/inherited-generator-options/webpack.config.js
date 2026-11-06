"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		generator: {
			asset: {
				filename: "assets/[name][ext]",
				dataUrl: { encoding: "base64" }
			}
		},
		rules: [
			{ test: /\.txt$/, type: "asset/source" },
			{ test: /\.bin$/, type: "asset/bytes" },
			{ test: /icon\.svg$/, resourceQuery: /inline/, type: "asset/inline" },
			{ test: /icon\.svg$/, resourceQuery: /resource/, type: "asset/resource" }
		]
	}
};
