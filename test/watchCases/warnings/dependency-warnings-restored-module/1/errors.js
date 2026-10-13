"use strict";

const list = [
	"missing-entry.js",
	"extra-dep",
	"imported",
	"reexported",
	"star-target",
	"walk-direct-target",
	"walk-transitive-target"
].map((request) => [
	/Module not found/,
	new RegExp(`Can't resolve '\\./${request.replace(".", "\\.")}'`)
]);

module.exports = [...list, ...list];
