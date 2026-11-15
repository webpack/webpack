it("should request a chunk under the public path where its filename starts with a slash", async () => {
	expect((await import(/* webpackChunkName: "lazy" */ "./value")).default).toBe(42);
	const stats = __STATS__.children[__STATS_I__];
	const chunk = stats.chunks.find((chunk) => chunk.names.includes("lazy"));
	expect(__webpack_get_script_filename__(chunk.id)).toBe("chunks/lazy.js");
});
