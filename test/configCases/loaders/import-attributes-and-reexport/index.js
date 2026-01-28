import { b } from "./a.js";

function foo() {
 return "a" + b();
}

it("should not duplicate modules", function() {
	expect(foo()).toEqual("ab");
});
