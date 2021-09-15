import { a, b } from "./a";

it("should export a const value without semicolon", function() {
	expect(a).toEqual({x: 1});
	expect(b).toEqual({x: 2});
});
