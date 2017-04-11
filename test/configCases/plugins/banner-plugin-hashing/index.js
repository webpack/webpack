const parseBanner = (banner) => {
	return banner
		.slice(4,-3) // remove comment syntax
		.split(", ") // into key:val pairs
		.map(n => n.split(":")) //[key, val]
		.reduce((acc, val) => {
			acc[val[0]] = val[1];
			return acc;
		}, {}); // { key: val }
};

var source = require("fs")
	.readFileSync(__filename, "utf-8")
	.split("\n")
	.slice(0,1)[0];

const banner = parseBanner(source)

it("should interpolate file hash in bundle0 chunk", function() {
	banner["hash"].should.not.containEql("[hash]");
});

it("should interpolate chunkHash in bundle0 chunk", function() {
	banner["chunkhash"].should.not.containEql("[chunkhash]");
});

require.include("./test.js");
