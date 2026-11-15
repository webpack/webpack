import { value } from "./dep";

global.magicCall = (text) => text.length;

class Shape {
	area() {
		return 0;
	}
}

const declared = magicCall("hello");
const lazy = import("./dep");

it("should build what path taps read", () => {
	expect(value).toBe(1);
	expect(declared).toBe(5);
	expect(new Shape().area()).toBe(0);
	expect(lazy).toBeInstanceOf(Promise);
	return import("./dep").then((dep) => {
		expect(dep.value).toBe(1);
	});
});
