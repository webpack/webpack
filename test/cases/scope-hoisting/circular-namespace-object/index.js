import value from "./module";

it("should have access to namespace object before evaluation", function() {
	value.should.be.eql("ok");
});
