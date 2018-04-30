import value from "dll/module";

it("should have still the correct default export", function() {
	value.should.be.eql("ok");
});
