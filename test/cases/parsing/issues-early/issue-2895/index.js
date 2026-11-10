import { a, b } from "./a";

it("issue-2895: should export a const value without semicolon", function() {
	expect(a).toEqual({x: 1});
	expect(b).toEqual({x: 2});
});
