const doImport = () => import(/* webpackChunkName: "the-chunk" */ "./chunk");

it("should be able to attach to an existing script tag", () => {
	const script = document.createElement("script");
	script.setAttribute("data-webpack", 'my "app":chunk-the-chunk');
	script.src = "/somewhere/else.js";
	document.head.appendChild(script);

	const promise = doImport();

	expect(document.head._children).toHaveLength(1);

	__non_webpack_require__("./the-chunk.js");
	script.onload();

	return promise.then(module => {
		expect(module).toEqual(nsObj({ default: "ok" }));

		const promise = doImport();

		expect(document.head._children).toHaveLength(0);

		return promise.then(module2 => {
			expect(module2).toBe(module);
		});
	});
});
