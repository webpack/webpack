"use strict";

module.exports = [
	"query?raw",
	"fragment#raw",
	"styles?query",
	"styles#fragment",
	"mixed?query",
	"lazy?query"
].map((name) => ({
	chunkName: new RegExp(`^${name.replace(/[-[\]\\/{}()*+?.^$|#]/g, "\\$&")}$`),
	message: /contains '\?' or '#'.*output filenames use/s
}));
