"use strict";

module.exports = require("./create-loader")(
	(options) =>
		Object.keys(options).every((key) => key === "name") &&
		(options.name === undefined || typeof options.name === "string")
);
