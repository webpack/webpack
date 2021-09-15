const parseBanner = banner => {
	return banner
		.slice(4, -3)
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
	.slice(0, 1)[0];

const banner = parseBanner(source);
const REGEXP_HASH = /^[A-Za-z0-9]{20}$/;

it("should interpolate file hash in chunk banner", () => {
	expect(REGEXP_HASH.test(banner["fullhash"])).toBe(true);
});

it("should interpolate chunkHash in chunk banner", () => {
	expect(REGEXP_HASH.test(banner["chunkhash"])).toBe(true);
});

it("should interpolate file into chunk banner", () => {
	expect(banner["file"]).toBe("dist/banner.js");
});

it("should interpolate name in chunk banner", () => {
	expect(banner["name"]).toBe("dist/banner");
});

it("should interpolate basename in chunk banner", () => {
	expect(banner["base"]).toBe("banner.js");
});

it("should interpolate query in chunk banner", () => {
	expect(banner["query"]).toBe("?value");
});

it("should interpolate path in chunk banner", () => {
	expect(banner["path"]).toBe("dist/");
});

it("should interpolate ext in chunk banner", () => {
	expect(banner["ext"]).toBe(".js");
});

it("should parse entry into file in chunk banner", () => {
	expect(banner["file"]).not.toBe(banner["base"]);
});

it("should parse entry into name in chunk banner", () => {
	expect(banner["base"]).not.toBe(banner["name"]);
});

if (Math.random() < 0) require("./test.js");
