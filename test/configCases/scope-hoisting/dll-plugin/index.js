import value from "dll/module";

it("should not scope hoist delegated modules", function() {
	value.should.be.eql("ok");
});
