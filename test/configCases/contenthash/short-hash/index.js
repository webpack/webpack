it("should leave the text of the bundles alone where a hash is one character", async () => {
	// Every hex digit, spelled out and built from char codes.
	const text = "0123456789abcdef";
	const codes = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102];
	expect(text).toBe(String.fromCharCode(...codes));
	expect((await import(/* webpackChunkName: "other" */ "./other")).default).toBe("other");
});
