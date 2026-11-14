it("should load a lazy chunk whose name starts with a slash from under the public path", async () => {
	expect(
		(await import(/* webpackChunkName: "/rooted/web" */ "./value")).default
	).toBe(42);
	const stats = __STATS__.children[__STATS_I__];
	const chunk = stats.chunks.find((chunk) => chunk.names.includes("/rooted/web"));
	expect(chunk.files).toEqual(["/rooted/web.js"]);
});
