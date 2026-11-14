"use strict";

exports.name = "unset";
exports.set = () => {
	exports.name = require("./a?never-called").name;
};
