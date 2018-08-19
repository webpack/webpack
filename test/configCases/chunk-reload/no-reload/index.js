it("should load failure and no reload", () => {
	const importer = import("./foo" /* webpackChunkName: "foo" */);
	const scripts = document.head._children;
	expect(scripts).toHaveLength(1);
	expect(scripts[0].src).toMatch(/foo.js/);
	expect(scripts[0].src).toMatch(/notFound/);
	scripts[0].onerror();
	expect(scripts).toHaveLength(1);
	return importer.catch(e => {
		expect(e).toBeInstanceOf(Error);
		return Promise.resolve();
	});
});
