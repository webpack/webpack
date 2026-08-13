const url = new URL("./asset.txt", import.meta.url);

it("should spell the url the runtime would have built", () => {
	// `x<hash>:8080/` is a scheme only once the hash is filled in, so resolving before
	// the fill would keep a base the runtime drops.
	const expected = new URL(
		`x${__STATS__.hash}:8080/asset.txt`,
		"https://example.com/base/"
	).href;
	expect(url.href).toBe(expected);
	expect(url.href).not.toContain("example.com");
});
