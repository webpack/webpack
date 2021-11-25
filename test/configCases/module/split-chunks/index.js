import value from "./separate";
import { test as t } from "external-self";

it("should compile", () => {
	expect(value).toBe(42);
});
it("should circular depend on itself external", () => {
	expect(test()).toBe(42);
	expect(t()).toBe(42);
});

function test() {
	return 42;
}

export { test };
