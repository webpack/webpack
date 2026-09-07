"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		copy: [
			{ from: "files/a.txt", filename: "renamed.txt" },
			{ from: "files", to: "hashed", filename: "[name].[contenthash][ext]" },
			{ from: "files", to: "fn", filename: (pathData) => pathData.filename },
			{ from: "files/a.txt", filename: "conflict.txt" },
			{ from: "files/b.txt", filename: "conflict.txt" },
			{ from: "files/a.txt", filename: "kept.txt" },
			{
				from: "files",
				to: (file) => (file.filename === "a.txt" ? "a-only" : "rest")
			}
		]
	}
};
