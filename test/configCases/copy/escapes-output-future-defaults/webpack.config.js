"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	experiments: { futureDefaults: true },
	output: {
		copy: [
			// `context` below what `from` names, so the copied path climbs out of it
			{
				from: path.resolve(__dirname, "outside-future.txt"),
				context: path.resolve(__dirname, "inside")
			},
			"inside"
		]
	}
};
