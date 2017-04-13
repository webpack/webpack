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

it("should interpolate file hash in bundle0 chunk", () => {
	banner["hash"].should.not.equal("[hash]");
});

it("should interpolate chunkHash in bundle0 chunk", () => {
	banner["chunkhash"].should.not.equal("[chunkhash]");
});

it("should interpolate name in bundle0 chunk", () => {
	banner["name"].should.not.equal("[name]");
});

it("should interpolate extension in bundle0 chunk", () => {
	banner["ext"].should.not.equal("[filebase]");
});

it("should interpolate extension in bundle0 chunk", () => {
	banner["query"].should.equal("");
});

require.include("./test.js");
