it("should allow to load a shared chunk in web", async () => {
	const promise = import(/* webpackChunkName: "chunk" */ "./chunk");
	expect(document.head._children).toHaveLength(1);
	const script = document.head._children[0];
	__non_webpack_require__("./chunk-0.js");
	script.onload();

	expect(await promise).toEqual(
		nsObj({
			default: 42
		})
	);
});
