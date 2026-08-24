it("should load an async chunk", function (done) {
	import(/* webpackChunkName: "lazy" */ "./lazy").then(function (module) {
		expect(module.value).toBe(42);
		done();
	}, done);
});

it("should emit a prefetch hint", function () {
	import(
		/* webpackChunkName: "prefetched", webpackPrefetch: true */ "./prefetched"
	).catch(function () {});
	var rels = document.head._children.map(function (child) {
		return child.rel;
	});
	expect(rels).toContain("prefetch");
});

it("should resolve an asset url", function () {
	var url = new URL("./asset.txt", import.meta.url);
	expect(String(url)).toMatch(/^https:\/\/test\.cases\/path\/.+\.txt$/);
});
