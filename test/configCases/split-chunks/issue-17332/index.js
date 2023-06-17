it('should run', async () => {
	await import(/* webpackChunkName: "foo" */ "./foo");

	const bar = __STATS__.modules.find(m => m.name.includes("bar.js"));

	expect(bar.chunks).toEqual(["split-foo"]);
})
