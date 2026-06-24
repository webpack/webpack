import url from "./file.bin";

it("re-encodes an asset-module [contenthash:<digest>] from the full content digest", () => {
	// 16 hex chars even though output.hashDigestLength is 8 — proves the inline
	// digest re-encodes from the retained full digest, not the truncated stored hash
	expect(url).toMatch(/(^|\/)file\.[0-9a-f]{16}\.bin$/);
});
