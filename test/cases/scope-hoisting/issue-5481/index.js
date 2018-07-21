import value from "./module";

it("should not cause name conflicts", function() {
	(typeof value).should.be.eql("undefined");
});
