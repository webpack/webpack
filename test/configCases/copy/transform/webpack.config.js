"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		copy: [
			{
				from: "src/k*.txt",
				to: "out",
				transform: (content, absoluteFilename) =>
					`${content.toString().toUpperCase()}:${path.basename(
						absoluteFilename
					)}`
			},
			{
				from: "src/keep.txt",
				to: "uncached",
				transform: {
					transformer: (content) => `${content.toString()}!`,
					cache: false
				}
			},
			{
				from: "src/keep.txt",
				to: "keyed",
				transform: {
					transformer: (content) => `${content.toString()}?`,
					cache: { keys: { version: 1 } }
				}
			},
			{
				from: "src/keep.txt",
				to: "keyed-fn",
				transform: {
					transformer: (content) => [...content.toString()].reverse().join(""),
					cache: {
						keys: (defaultKeys) => ({ ...defaultKeys, version: 2 })
					}
				}
			}
		]
	}
};
