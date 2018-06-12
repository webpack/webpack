
let oldNonce;
let oldPublicPath;

beforeEach(() => {
	oldNonce = __webpack_nonce__;
	oldPublicPath = __webpack_public_path__;
});

afterEach(() => {
	__webpack_nonce__ = oldNonce;
	__webpack_public_path__ = oldPublicPath;
})

it("should prefetch and preload child chunks on chunk load", () => {
	__webpack_nonce__ = "nonce";
	__webpack_public_path__ = "/public/path/";

	let link, script;

	expect(document.head._children).toHaveLength(1);

	// Test prefetch from entry chunk
	link = document.head._children[0];
	expect(link._type).toBe("link");
	expect(link.rel).toBe("prefetch");
	expect(link.href).toMatch(/chunk1\.js$/);

	const promise = import(/* webpackChunkName: "chunk1", webpackPrefetch: true */ "./chunk1");

	expect(document.head._children).toHaveLength(3);

	// Test normal script loading
	script = document.head._children[1];
	expect(script._type).toBe("script");
	expect(script.src).toMatch(/chunk1\.js$/);
	expect(script.getAttribute("nonce")).toBe("nonce")
	expect(script.crossOrigin).toBe("anonymous");
	expect(script.onload).toBeTypeOf("function");

	// Test preload of chunk1-b
	link = document.head._children[2];
	expect(link._type).toBe("link");
	expect(link.rel).toBe("preload");
	expect(link.as).toBe("script");
	expect(link.href).toMatch(/chunk1-b\.js$/);
	expect(link.charset).toBe("utf-8");
	expect(link.getAttribute("nonce")).toBe("nonce");
	expect(link.crossOrigin).toBe("anonymous");

	// Run the script
	__non_webpack_require__("./chunk1.js");

	script.onload();

	return promise.then(() => {
		expect(document.head._children).toHaveLength(5);

		// Test prefetching for chunk1-c and chunk1-a in this order
		link = document.head._children[3];
		expect(link._type).toBe("link");
		expect(link.rel).toBe("prefetch");
		expect(link.href).toMatch(/chunk1-c\.js$/);
		expect(link.crossOrigin).toBe("anonymous");

		link = document.head._children[4];
		expect(link._type).toBe("link");
		expect(link.rel).toBe("prefetch");
		expect(link.href).toMatch(/chunk1-a\.js$/);
		expect(link.crossOrigin).toBe("anonymous");

		const promise2 = import(/* webpackChunkName: "chunk1", webpackPrefetch: true */ "./chunk1");

		// Loading chunk1 again should not trigger prefetch/preload
		expect(document.head._children).toHaveLength(5);

		const promise3 = import(/* webpackChunkName: "chunk2" */ "./chunk2");

		expect(document.head._children).toHaveLength(6);

		// Test normal script loading
		script = document.head._children[5];
		expect(script._type).toBe("script");
		expect(script.src).toMatch(/chunk2\.js$/);
		expect(script.getAttribute("nonce")).toBe("nonce")
		expect(script.crossOrigin).toBe("anonymous");
		expect(script.onload).toBeTypeOf("function");

		// Run the script
		__non_webpack_require__("./chunk2.js");

		script.onload();

		return promise3.then(() => {
			// Loading chunk2 again should not trigger prefetch/preload as it's already prefetch/preloaded
			expect(document.head._children).toHaveLength(6);
		});
	});
})
