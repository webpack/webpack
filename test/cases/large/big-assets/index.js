const createHash = require("../../../../lib/util/hash/xxhash64");
const fs = require("fs");

const h = url => {
	const hash = createHash();
	hash.update(fs.readFileSync(url));
	return hash.digest("hex");
};

it("should compile fine", () => {
	const a = new URL(
		"./generate-big-asset-loader.js?size=100000000!",
		import.meta.url
	);
	const b = new URL(
		"./generate-big-asset-loader.js?size=200000000!",
		import.meta.url
	);
	const c = new URL(
		"./generate-big-asset-loader.js?size=300000000!",
		import.meta.url
	);
	const d = new URL(
		"./generate-big-asset-loader.js?size=400000000!",
		import.meta.url
	);
	const e = new URL(
		"./generate-big-asset-loader.js?size=500000000!",
		import.meta.url
	);
	const f = new URL(
		"./generate-big-asset-loader.js?size=600000000!",
		import.meta.url
	);
	expect(h(a)).toBe("a7540f59366bb641");
	expect(h(b)).toBe("f642344242fa9de4");
	expect(h(c)).toBe("255d2b78f94dd585");
	expect(h(d)).toBe("c75503096358dd24");
	expect(h(e)).toBe("33ba203498301384");
	expect(h(f)).toBe("e71a39b9b1138c07");
});
