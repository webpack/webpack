import { a, b } from "./module";

function func(x = a, y = b) {
	return [x, y];
}

var func2 = function(x = a, y = b) {
	return [x, y];
}

it("should import into default parameters", function() {
	expect(func()).toEqual(["a", "b"]);
	expect(func2()).toEqual(["a", "b"]);
	expect(func(1)).toEqual([1, "b"]);
	expect(func2(2)).toEqual([2, "b"]);
});
