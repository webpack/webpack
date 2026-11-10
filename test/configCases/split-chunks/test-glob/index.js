it("should split only the modules the glob takes", async () => {
	await import(/* webpackChunkName: "foo" */ "./foo");

	const chunksOf = (name) =>
		__STATS__.modules.find((m) => m.name.includes(name)).chunks;

	expect(chunksOf("vendor/lib.js")).toEqual(["vendor-vendor_lib_js"]);
	// subtracted by the `!` pattern
	expect(chunksOf("vendor/skip.js")).toEqual(["foo"]);
});
