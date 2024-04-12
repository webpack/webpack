// This config need to be set on initial evaluation to be effective
__webpack_nonce__ = "nonce";
__webpack_public_path__ = "https://example.com/public/path/";

it("should prefetch and preload child chunks on chunk load", () => {
	let link;

	expect(document.head._children).toHaveLength(2);

	// Test prefetch from entry chunk
	link = document.head._children[0];
	expect(link._type).toBe("link");
	expect(link.rel).toBe("prefetch");
	expect(link.as).toBe("script");
	expect(link.href).toBe("https://example.com/public/path/chunk1.mjs");

	link = document.head._children[1];
	expect(link._type).toBe("link");
	expect(link.rel).toBe("prefetch");
	expect(link.as).toBe("style");
	expect(link.href).toBe("https://example.com/public/path/chunk2-css.css");

	const promise = import(
		/* webpackChunkName: "chunk1", webpackPrefetch: true */ "./chunk1.mjs"
	);

	expect(document.head._children).toHaveLength(4);

	// Test normal script loading
	link = document.head._children[2];
	expect(link._type).toBe("link");
	expect(link.rel).toBe("preload");
	expect(link.as).toBe("style");
	expect(link.href).toBe("https://example.com/public/path/chunk1-a-css.css");
	expect(link.getAttribute("nonce")).toBe("nonce");
	expect(link.crossOrigin).toBe("anonymous");

	// Test preload of chunk1-b
	link = document.head._children[3];
	expect(link._type).toBe("link");
	expect(link.rel).toBe("modulepreload");
	expect(link.href).toBe("https://example.com/public/path/chunk1-b.mjs");
	expect(link.charset).toBe("utf-8");
	expect(link.getAttribute("nonce")).toBe("nonce");
	expect(link.crossOrigin).toBe("anonymous");

	return promise.then(() => {
		expect(document.head._children).toHaveLength(6);

		// Test prefetching for chunk1-c and chunk1-a in this order
		link = document.head._children[4];
		expect(link._type).toBe("link");
		expect(link.rel).toBe("prefetch");
		expect(link.as).toBe("script");
		expect(link.href).toBe("https://example.com/public/path/chunk1-c.mjs");
		expect(link.crossOrigin).toBe("anonymous");

		link = document.head._children[5];
		expect(link._type).toBe("link");
		expect(link.href).toBe("https://example.com/public/path/chunk1-a.mjs");
		expect(link.getAttribute("nonce")).toBe("nonce");
		expect(link.crossOrigin).toBe("anonymous");

		const promise2 = import(
			/* webpackChunkName: "chunk1", webpackPrefetch: true */ "./chunk1.mjs"
		);

		// Loading chunk1 again should not trigger prefetch/preload
		expect(document.head._children).toHaveLength(6);

		const promise3 = import(/* webpackChunkName: "chunk2" */ "./chunk2.mjs");

		expect(document.head._children).toHaveLength(6);

		return promise3.then(() => {
			// Loading chunk2 again should not trigger prefetch/preload as it's already prefetch/preloaded
			expect(document.head._children).toHaveLength(6);

			const promise4 = import(/* webpackChunkName: "chunk1-css" */ "./chunk1.css");

			expect(document.head._children).toHaveLength(7);

			link = document.head._children[6];
			expect(link._type).toBe("link");
			expect(link.rel).toBe("stylesheet");
			expect(link.href).toBe("https://example.com/public/path/chunk1-css.css");
			expect(link.crossOrigin).toBe("anonymous");

			const promise5 = import(/* webpackChunkName: "chunk2-css", webpackPrefetch: true */ "./chunk2.css");

			expect(document.head._children).toHaveLength(8);

			link = document.head._children[7];
			expect(link._type).toBe("link");
			expect(link.rel).toBe("stylesheet");
			expect(link.href).toBe("https://example.com/public/path/chunk2-css.css");
			expect(link.crossOrigin).toBe("anonymous");
		});
	});
});
