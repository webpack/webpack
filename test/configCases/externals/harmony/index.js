import external from "external";

it("should harmony import a dependency", function() {
	external.should.be.eql("abc");
});
