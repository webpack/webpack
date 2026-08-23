"use strict";

const { describeCases } = require("./TestCases.template");

describe("TestCases", () => {
	describeCases(
		/** @type {any} */ ({
			name: "all-combined",
			mode: "production",
			devtool: "source-map",
			minimize: true,
			optimization: {
				moduleIds: "named",
				chunkIds: "named"
			},
			plugins: [
				/** @param {import("../").Compiler} c compiler */
				(c) => {
					const webpack = require("..");

					new webpack.HotModuleReplacementPlugin().apply(c);
				}
			]
		})
	);
});
