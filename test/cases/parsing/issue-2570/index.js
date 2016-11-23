import fn from "./fn";

it("should generate valid code when calling a harmony import function with brackets", function() {
	var a = fn((1));
	var b = fn(2);
	var c = fn((3), (4));
	var d = fn(5, (6));

	a.should.be.eql([1]);
	b.should.be.eql([2]);
	c.should.be.eql([3, 4]);
	d.should.be.eql([5, 6]);
});
