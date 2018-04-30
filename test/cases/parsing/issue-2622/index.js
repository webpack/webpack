import { a, b } from "./module";

function func(x = a, y = b) {
	return [x, y];
}

var func2 = function(x = a, y = b) {
	return [x, y];
}

it("should import into default parameters", function() {
	func().should.be.eql(["a", "b"]);
	func2().should.be.eql(["a", "b"]);
	func(1).should.be.eql([1, "b"]);
	func2(2).should.be.eql([2, "b"]);
});
