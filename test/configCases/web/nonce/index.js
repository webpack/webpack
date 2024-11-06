import "./nonce";

it("should set nonce", () => {
	expect(__webpack_nonce__).toBe("nonce");
});

it("should set nonce attributes", () => {
	import(/* webpackChunkName: "chunk-js" */ "./chunk.js");

	expect(document.head._children).toHaveLength(1);

	const script = document.head._children[0];

	expect(script._type).toBe("script");
	expect(script.getAttribute("nonce")).toBe("nonce");
	expect(script.src).toBe("https://example.com/chunk-js.js");

	import(/* webpackChunkName: "chunk-css" */ "./chunk.css");

	expect(document.head._children).toHaveLength(2);

	const link = document.head._children[1];

	expect(link._type).toBe("link");
	expect(link.getAttribute("nonce")).toBe("nonce");
	expect(link.href).toBe("https://example.com/chunk-css.css");
});
