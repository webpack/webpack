it("should preserve an explicit query in the chunk filename template", () => {
	const load = () => import(/* webpackChunkName: "valid%3F%23" */ "./value");
	expect(typeof load).toBe("function");
	expect(__webpack_get_script_filename__("valid%3F%23"))
		.toMatch(/^valid%3F%23\.js\?version=[a-f0-9]+#fragment$/);
	expect(__STATS__.warnings).toEqual([]);
});
