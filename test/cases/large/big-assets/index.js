const createHash = require("../../../../lib/util/hash/xxhash64");
const fs = require("fs");

const h = url => {
	const hash = createHash();
	hash.update(fs.readFileSync(url));
	return hash.digest("hex");
};

// larger than V8's ~512 MB string limit, so it can't round-trip as a string
it("should compile fine", () => {
	const url = new URL(
		"./generate-big-asset-loader.js?size=600000000!",
		import.meta.url
	);
	expect(h(url)).toBe("e71a39b9b1138c07");
});
