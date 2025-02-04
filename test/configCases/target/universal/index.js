import value from "./separate";
import { test as t } from "external-self";

it("should compile", () => {
	expect(value).toBe(42);
});

it("should circular depend on itself external", () => {
	expect(test()).toBe(42);
	expect(t()).toBe(42);
});

it("work with URL", () => {
	const url = new URL("./file.png", import.meta.url);
	expect(/[a-f0-9]{20}\.png/.test(url)).toBe(true);
});

function test() {
	return 42;
}

export { test };
