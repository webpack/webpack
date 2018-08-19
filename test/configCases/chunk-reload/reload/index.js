it("should reload success", async () => {
	const importer = import("./foo" /* webpackChunkName: "foo" */);
	let scripts = document.head._children;
	expect(scripts).toHaveLength(1);
	expect(scripts[0].src).toMatch(/foo.js/);
	expect(scripts[0].src).toMatch(/notFound/);
	scripts[0].onerror();
	scripts = document.head._children;
	expect(scripts).toHaveLength(2);
	expect(scripts[1].src).toMatch(/foo.js/);
	expect(scripts[1].src).not.toMatch(/notFound/);
	__non_webpack_require__("./foo.js");
	scripts[1].onload();
	const foo = await importer;
	expect(foo.default).toBe("foo");
});
