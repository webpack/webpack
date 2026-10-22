"use strict";

const TYPES = [
	"commonjs",
	"commonjs2",
	"commonjs-module",
	"commonjs-static",
	"umd",
	"umd2",
	"module",
	"modern-module"
];

module.exports = {
	findBundle(i) {
		return [`./${TYPES[i]}.js`];
	}
};
