import { a, b, aa, bb } from './json.js'

it("should reexport json data correctly", () => {
	aa.should.be.eql({ a: "A" });
	bb.should.be.eql({ b: "B" });
	a.should.be.eql("A");
	b.should.be.eql("B");
});

