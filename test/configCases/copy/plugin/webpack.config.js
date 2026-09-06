"use strict";

const { CopyPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [new CopyPlugin({ patterns: ["static"] })]
};
