it("should handle the css loader correctly", function() {
	(require("!css-loader!../_css/stylesheet.css") + "").indexOf(".rule-direct").should.not.be.eql(-1);
	(require("!css-loader!../_css/stylesheet.css") + "").indexOf(".rule-import1").should.not.be.eql(-1);
	(require("!css-loader!../_css/stylesheet.css") + "").indexOf(".rule-import2").should.not.be.eql(-1);
});
