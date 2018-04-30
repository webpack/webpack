import { test } from "./file";

it("should allow import in array destructing", function() {
	var other;
	[other = test] = [];
	other.should.be.eql("test");
});

it("should allow import in object destructing", function() {
	var other;
	({other = test} = {});
	other.should.be.eql("test");
});
