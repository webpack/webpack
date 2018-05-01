it("should handle the less loader (piped with raw loader) correctly", function() {
	expect(
        require("!raw-loader!less-loader!./less/stylesheet.less").indexOf(".less-rule-direct")
    ).not.toEqual(-1);
	expect(
        require("!raw-loader!less-loader!./less/stylesheet.less").indexOf(".less-rule-import1")
    ).not.toEqual(-1);
	expect(
        require("!raw-loader!less-loader!./less/stylesheet.less").indexOf(".less-rule-import2")
    ).not.toEqual(-1);
});
