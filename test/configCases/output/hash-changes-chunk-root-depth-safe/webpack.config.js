"use strict";

const path = require("path");
const SlashHash = require("../hash-changes-chunk-root-depth/SlashHash");

/** @type {(import("../../../../").Configuration | ((env: unknown, options: { testPath: string }) => import("../../../../").Configuration))[]} */
module.exports = [
	...[
		{ hashDigest: "hex", publicPath: "auto" },
		{ hashDigest: "base64url", publicPath: "auto" },
		{ hashDigest: "base64", publicPath: "https://test.cases/path/" }
	].map((output, index) => ({
		mode: "none",
		target: "web",
		output: {
			filename: `bundle${index}/static/js/[name].[contenthash:4].js`,
			chunkFilename: `bundle${index}/static/js/chunks/[name].js`,
			hashFunction: SlashHash,
			...output
		}
	})),
	// the require chunk loader asks for "./dist/", the emitted file needs "dist/"
	(env, { testPath }) => ({
		mode: "none",
		target: "node",
		output: {
			path: path.join(testPath, "bundle3", "dist"),
			filename: "../main.js",
			chunkFilename: "[name].js",
			publicPath: "https://test.cases/path/"
		}
	})
];
