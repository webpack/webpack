"use strict";

const { DefinePlugin, ManifestPlugin } = require("../../../../");

/** @type {{ prefix?: string, publicPath: string, expectedPrefix: string }[]} */
const cases = [
	{ prefix: "", publicPath: "/cdn/", expectedPrefix: "" },
	{ prefix: "", publicPath: "auto", expectedPrefix: "" },
	{ publicPath: "/cdn/", expectedPrefix: "/cdn/" },
	{ publicPath: "auto", expectedPrefix: "/" },
	{ prefix: "assets/", publicPath: "/cdn/", expectedPrefix: "assets/" },
	{
		prefix: "[publicpath]assets/",
		publicPath: "/cdn/",
		expectedPrefix: "/cdn/assets/"
	},
	{ publicPath: "", expectedPrefix: "" }
];

/** @type {import("../../../../").Configuration[]} */
module.exports = cases.map(({ prefix, publicPath, expectedPrefix }, index) => ({
	output: {
		publicPath
	},
	plugins: [
		new ManifestPlugin({ filename: `manifest${index}.json`, prefix }),
		new DefinePlugin({
			EXPECTED_MANIFEST: JSON.stringify(`manifest${index}.json`),
			EXPECTED_FILE: JSON.stringify(`${expectedPrefix}bundle${index}.js`)
		})
	]
}));
