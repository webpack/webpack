"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	module: {
		rules: [
			{
				test: /.css$/,
				resourceQuery: /\?local-ident-name-1$/,
				generator: {
					// TODO do we need to support `[hash]` as  `[fullhash]` here
					localIdentName: "[name]--[local]--[fullhash]",
					localIdentHashDigest: "base64url",
					localIdentHashDigestLength: 5
				}
			}
		]
	},

	experiments: {
		css: true
	}
};
