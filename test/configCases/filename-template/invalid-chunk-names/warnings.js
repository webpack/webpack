"use strict";

module.exports = [
	"query?raw",
	"fragment#raw",
	"styles?query",
	"styles#fragment",
	"mixed?query"
].map((name) => ({
	chunkName: new RegExp(`^${name.replace(/[?#]/g, "\\$&")}$`),
	message: /contains '\?' or '#'.*chunk loading/s
}));
