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

it("should interpolate file hash in chunk banner", () => {
	REGEXP_HASH.test(banner["hash"]).should.be.true;
});

it("should interpolate chunkHash in chunk banner", () => {
	REGEXP_HASH.test(banner["chunkhash"]).should.be.true;
});

it("should interpolate file into chunk banner", () => {
	banner["file"].should.equal("dist/banner.js");
});

it("should interpolate name in chunk banner", () => {
	banner["name"].should.equal("dist/banner");
});

it("should interpolate basename in chunk banner", () => {
	banner["filebase"].should.equal("banner.js");
});

it("should interpolate query in chunk banner", () => {
	banner["query"].should.equal("?value");
});

it("should parse entry into file in chunk banner", () => {
	banner["file"].should.not.equal(banner["filebase"]);
});

it("should parse entry into name in chunk banner", () => {
	banner["filebase"].should.not.equal(banner["name"]);
});

require.include("./test.js");
