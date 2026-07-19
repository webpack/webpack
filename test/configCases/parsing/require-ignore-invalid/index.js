it("should warn on invalid webpackIgnore comments", () => {
	expect(require("./reassign").ok).toBe(true);
	if (typeof __nonexistent__ !== "undefined") {
		require(/* webpackIgnore: "yes" */ "./mod");
		require(/* webpackIgnore: [ */ "./mod");
		require.resolve(/* webpackIgnore: "yes" */ "./mod");
		require.resolve(/* webpackIgnore: [ */ "./mod");
		module.exports = define;
		let d;
		d = define;
		expect(d).toBeDefined();
	}
});
