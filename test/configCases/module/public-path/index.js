// This config need to be set on initial evaluation to be effective
__webpack_nonce__ = "nonce";

it("should be able to load a chunk", async () => {
	const module = await import("./chunk");
	expect(module.default).toBe(42);

	if (typeof document !== "undefined") {
		expect(document.head._children).toHaveLength(1);

		// Test prefetch from entry chunk
		const link = document.head._children[0];
		expect(link._type).toBe("link");
		expect(link.rel).toBe("prefetch");

		switch (__STATS_I__) {
			case 8:
			case 9:
			case 10:
			case 11: {
				expect(link.href.startsWith("https://example.com/public/path/")).toBe(true);
			}
		}

	}

	const module1 = await import(/* webpackPrefetch: true */ "./chunk1");
	expect(module1.default).toBe(43);
});
