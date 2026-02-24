"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	module: {
		rules: [
			{
				oneOf: [
					{
						test: /\.png$/i,
						resourceQuery: /asset/,
						type: "asset"
					},
					{
						test: /\.png$/i,
						resourceQuery: /bytes/,
						type: "asset/bytes"
					},
					{
						test: /\.png$/i,
						resourceQuery: /inline/,
						type: "asset/inline"
					},
					{
						test: /\.png$/i,
						resourceQuery: /source/,
						type: "asset/source"
					},
					{ test: /\.png$/i, type: "asset/resource" }
				]
			}
		]
	},
	optimization: {
		sideEffects: true,
		moduleIds: "named",
		concatenateModules: false
	},
	experiments: {
		futureDefaults: true
	}
};
