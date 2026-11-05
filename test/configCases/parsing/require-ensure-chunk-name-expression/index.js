it("should drop a computed require.ensure chunk name without leaking its replacements", (done) => {
	var name = "a";
	require.ensure(
		[],
		function (require) {
			expect(require("./dir/a.js")).toBe("a");
			done();
		},
		"named" || require(`./dir/${name}.js`)
	);
});
