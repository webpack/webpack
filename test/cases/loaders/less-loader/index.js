it("should handle the less loader (piped with raw loader) correctly", function() {
	require("!raw!less!./less/stylesheet.less").indexOf(".less-rule-direct").should.not.be.eql(-1);
	require("!raw!less!./less/stylesheet.less").indexOf(".less-rule-import1").should.not.be.eql(-1);
	require("!raw!less!./less/stylesheet.less").indexOf(".less-rule-import2").should.not.be.eql(-1);
});
