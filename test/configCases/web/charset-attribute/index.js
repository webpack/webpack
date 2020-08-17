const doImport = () => import(/* webpackChunkName: "chunk1" */ "./chunk1");
__webpack_public_path__ = "https://example.com/public/path/";

it("should not add charset attribute", () => {
	const promise = doImport();
	expect(document.head._children).toHaveLength(1);

	const script = document.head._children[0];
	console.log(script);
	expect(script._type).toBe("script");
	expect(script.src).toBe("https://example.com/public/path/chunk1.js");
	expect(script.getAttribute("charset")).toBeUndefined();
});
