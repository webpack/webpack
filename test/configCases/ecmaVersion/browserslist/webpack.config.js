const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: [
		"web",
		`browserslist://${path.join(__dirname, ".browserslistrc")}:modern`
	]
};
