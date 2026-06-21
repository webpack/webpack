it("should handle the less loader (piped with raw loader) correctly", function() {
	expect(
		require("!raw-loader!./less-loader-cjs!./less/stylesheet.less").default
	).toContain(".less-rule-direct");
	expect(
		require("!raw-loader!./less-loader-cjs!./less/stylesheet.less").default
	).toContain(".less-rule-import1");
	expect(
		require("!raw-loader!./less-loader-cjs!./less/stylesheet.less").default
	).toContain(".less-rule-import2");
});
