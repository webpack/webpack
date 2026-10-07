const createHash = require("../../../../lib/util/hash/xxhash64");
const fs = require("fs");

const h = url => {
	const hash = createHash();
	hash.update(fs.readFileSync(url));
	return hash.digest("hex");
};

// one asset below V8's ~512 MB string limit and one above it
it("should compile fine", () => {
	const a = new URL(
		"./generate-big-asset-loader.js?size=100000000!",
		import.meta.url
	);
	const f = new URL(
		"./generate-big-asset-loader.js?size=600000000!",
		import.meta.url
	);
	expect(h(a)).toBe("a7540f59366bb641");
	expect(h(f)).toBe("e71a39b9b1138c07");
});
