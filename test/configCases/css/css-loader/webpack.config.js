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
			},
			{
				test: /.css$/,
				resourceQuery: /\?local-ident-name-2$/,
				generator: {
					localIdentName: "-1[local]"
				}
			},
			{
				test: /.css$/,
				resourceQuery: /\?local-ident-name-3$/,
				generator: {
					localIdentName: "--[local]"
				}
			},
			{
				test: /.css$/,
				resourceQuery: /\?local-ident-name-4$/,
				generator: {
					localIdentName: "__[local]"
				}
			},
			{
				test: /.css$/,
				resourceQuery: /\?local-ident-name-5$/,
				generator: {
					localIdentName: "[local]--[fullhash]"
				}
			}
		]
	},

	experiments: {
		css: true
	}
};
