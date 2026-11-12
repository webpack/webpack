"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		generator: {
			// reaches every `asset/*` type, each taking only the keys it uses
			asset: {
				filename: "assets/[name][ext]",
				dataUrl: { encoding: "base64" }
			}
		},
		rules: [
			{ test: /icon\.svg$/, resourceQuery: /inline/, type: "asset/inline" },
			{ test: /icon\.svg$/, resourceQuery: /resource/, type: "asset/resource" }
		]
	}
};
