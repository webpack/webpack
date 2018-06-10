import {x, f} from "./x";

it("should import into object literal", function() {
	(expect({ x: x })).toEqual({x: 1});
	var obj = { x: x };
	expect(obj).toEqual({x: 1});
});

function func(z) {
	return z;
}

it("should import into function argument", function() {
	expect(func(x)).toBe(1);
	expect(f(x)).toBe(1);
	expect(func({x:x})).toEqual({x:1});
	expect(f({x:x})).toEqual({x:1});
	var y = f(x);
	expect(y).toBe(1);
	y = function() {
		return x;
	};
	expect(y()).toBe(1);
});

it("should import into array literal", function() {
	expect([x, f(2)]).toEqual([1, 2]);
	expect([{
		value: x
	}]).toEqual([{ value: x }]);
});
