__webpack_public_path__ = "https://example.com/public/path/";

it("should prefetch and preload child chunks on chunk load", () => {
	let link;
	const hasBrowser = typeof document !== "undefined";

	if (hasBrowser) {
		expect(document.head._children).toHaveLength(1);

		// Test prefetch from entry chunk
		link = document.head._children[0];
		expect(link._type).toBe("link");
		expect(link.rel).toBe("prefetch");
		expect(link.as).toBe("script");
		expect(link.href).toBe("https://example.com/public/path/chunk1.mjs");
		expect(link.charset).toBe("utf-8");
		expect(link.crossOrigin).toBe("anonymous");
	}

	const promise = import(
		/* webpackChunkName: "chunk1", webpackPrefetch: true */ "./chunk1.mjs"
	);

	if (hasBrowser) {
		expect(document.head._children).toHaveLength(2);

		// Test preload of chunk1-b
		link = document.head._children[1];
		expect(link._type).toBe("link");
		expect(link.rel).toBe("modulepreload");
		expect(link.href).toBe("https://example.com/public/path/chunk1-b.mjs");
		expect(link.charset).toBe("utf-8");
		expect(link.crossOrigin).toBe("anonymous");
	}

	return promise.then(() => {
		if (hasBrowser) {
			expect(document.head._children).toHaveLength(3);

			// Test prefetch of chunk1-a
			link = document.head._children[2];
			expect(link._type).toBe("link");
			expect(link.rel).toBe("prefetch");
			expect(link.as).toBe("script");
			expect(link.href).toBe("https://example.com/public/path/chunk1-a.mjs");
			expect(link.crossOrigin).toBe("anonymous");
		}
	});
});

