const parseBanner = (banner) => {
	return banner
		.slice(4,-3)
		.split(", ")
		.map(n => n.split(":"))
		.reduce((acc, val) => {
			acc[val[0]] = val[1];
			return acc;
		}, {});
};

var source = require("fs")
	.readFileSync(__filename, "utf-8")
	.split("\n")
	.slice(0,1)[0];

const banner = parseBanner(source)
const REGEXP_HASH = /^[A-Za-z0-9]{20}$/

it("should interpolate file hash in bundle0 chunk", () => {
	REGEXP_HASH.test(banner["hash"]).should.be.true;
});

it("should interpolate chunkHash in bundle0 chunk", () => {
	REGEXP_HASH.test(banner["chunkhash"]).should.be.true;
});

it("should interpolate name in bundle0 chunk", () => {
	banner["name"].should.equal("banner");
});

it("should interpolate extension in bundle0 chunk", () => {
	banner["basename"].should.equal("banner.js");
});

it("should interpolate extension in bundle0 chunk", () => {
	banner["query"].should.equal("");
});

require.include("./test.js");
