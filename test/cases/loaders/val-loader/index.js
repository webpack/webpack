it("should handle the val loader (piped with css loader) correctly", function() {
	(require("!css-loader!val-loader!../_css/generateCss") + "").indexOf("generated").should.not.be.eql(-1);
	(require("!css-loader!val-loader!../_css/generateCss") + "").indexOf(".rule-import2").should.not.be.eql(-1);
	(require("!raw-loader!val-loader!../_css/generateCss") + "").indexOf("generated").should.not.be.eql(-1);
});
