import fn from "./fn";

it("should generate valid code when calling a harmony import function with brackets", function() {
	var a = fn((1));
	var b = fn(2);
	var c = fn((3), (4));
	var d = fn(5, (6));

	expect(a).toEqual([1]);
	expect(b).toEqual([2]);
	expect(c).toEqual([3, 4]);
	expect(d).toEqual([5, 6]);
});
