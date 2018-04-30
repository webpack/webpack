import {x, f} from "./x";

it("should import into object literal", function() {
	({ x: x }).should.be.eql({x: 1});
	var obj = { x: x };
	obj.should.be.eql({x: 1});
});

function func(z) {
	return z;
}

it("should import into function argument", function() {
	func(x).should.be.eql(1);
	f(x).should.be.eql(1);
	func({x:x}).should.be.eql({x:1});
	f({x:x}).should.be.eql({x:1});
	var y = f(x);
	y.should.be.eql(1);
	y = function() {
		return x;
	};
	y().should.be.eql(1);
});

it("should import into array literal", function() {
	([x, f(2)]).should.be.eql([1, 2]);
	([{
		value: x
	}]).should.be.eql([{ value: x }]);
});
