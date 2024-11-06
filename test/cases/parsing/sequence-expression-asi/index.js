import { fn } from "./a"

function d() {}

var num = 1
d(), fn();

export const b = 2
d(), fn();

export default (function Foo() {})
d(), fn();

export const c = 3
function foo() {
	d(), fn();
}

it("should work", function() {
	expect(fn(num)).toBe(1);
});
