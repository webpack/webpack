it("should request it under the public path where the chunk filename is a function", async () => {
	expect(
		(await import(/* webpackChunkName: "/rooted/function" */ "./value")).default
	).toBe(42);
	const stats = __STATS__.children[__STATS_I__];
	const chunk = stats.chunks.find((chunk) => chunk.names.includes("/rooted/function"));
	expect(__webpack_get_script_filename__(chunk.id)).toBe("rooted/function.js");
});
