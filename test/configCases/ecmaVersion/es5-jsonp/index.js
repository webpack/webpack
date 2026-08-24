it("should run in a realm that really lacks what the target lacks", function () {
	expect(typeof globalThis).toBe("undefined");
	expect(typeof Symbol).toBe("undefined");
	expect(typeof BigInt).toBe("undefined");
	expect(typeof Object.hasOwn).toBe("undefined");
});

it("should load an async chunk without leaving es5", function (done) {
	import(/* webpackChunkName: "lazy" */ "./lazy").then(function (module) {
		expect(module.value).toBe(42);
		done();
	}).catch(done);
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
