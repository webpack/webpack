it("should handle the val loader (piped with css loader) correctly", function() {
	require("!css!val!../_css/generateCss").indexOf("generated").should.not.be.eql(-1);
	require("!css!val!../_css/generateCss").indexOf(".rule-import2").should.not.be.eql(-1);
	require("!raw!val!../_css/generateCss").indexOf("generated").should.not.be.eql(-1);
});
