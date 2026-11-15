it("should load a lazy chunk whose name starts with a slash from under the public path", async () => {
	expect(
		(await import(/* webpackChunkName: "/rooted/web" */ "./value")).default
	).toBe(42);
	const stats = __STATS__.children[__STATS_I__];
	const chunk = stats.chunks.find((chunk) => chunk.names.includes("/rooted/web"));
	expect(chunk.files).toEqual(["/rooted/web.js"]);
});

it("should request it under the public path", () => {
	const stats = __STATS__.children[__STATS_I__];
	const chunk = stats.chunks.find((chunk) => chunk.names.includes("/rooted/web"));
	expect(__webpack_get_script_filename__(chunk.id)).toBe("rooted/web.js");
});
