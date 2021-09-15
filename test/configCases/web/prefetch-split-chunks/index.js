import "./public-path";

it("should prefetch correctly", () => {
	expect(document.head._children).toHaveLength(1);

	// Test prefetch from entry chunk
	const link = document.head._children[0];
	expect(link._type).toBe("link");
	expect(link.rel).toBe("prefetch");
	expect(link.href).toBe("https://example.com/public/path/chunk1.js");

	if (Math.random() < -1) {
		import(/* webpackChunkName: "chunk1", webpackPrefetch: true */ "./chunk1");
	}
});
