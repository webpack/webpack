import { a, b } from "./a";

it("should export a const value without semicolon", function() {
	a.should.be.eql({x: 1});
	b.should.be.eql({x: 2});
});
