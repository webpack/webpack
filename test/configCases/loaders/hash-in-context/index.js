it("should have hmr flag in loader context", function() {
	expect(require("./loader!")).toMatchObject({
		digest: "a0fdc3d2f3863f64d95950fc06af72f7",
		digestWithLength: "a0fdc3d2f3863f64d959",
		hashFunction: "md4",
		hashDigest: "hex",
		hashDigestLength: 20,
		hashSalt: "salt",
	});
});
