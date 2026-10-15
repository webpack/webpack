"use strict";

const errors = [
	"cjs-dep",
	"esm-dep",
	"star-dep",
	"swap-a.js",
	"swap-a.js",
	"swap-c.js",
	"url-dep.js"
].map((request) => [
	/Module not found/,
	new RegExp(`Can't resolve '\\./${request}'`)
]);

module.exports = [...errors, ...errors];
