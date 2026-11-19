import { getFirst, readNested } from "./first.js";
import { getSecond, readConstant } from "./second.js";

it("should preserve repeated namespace escapes in each runtime", () => {
	const first = getFirst();
	const second = getSecond();
	for (const namespace of [first, second]) {
		expect(namespace.__esModule).toBe(true);
		expect(namespace.constant).toBe(42);
		expect(namespace.nested.answer).toBe(7);
		expect(namespace.nested.other).toBe(9);
		expect(Object.keys(namespace).sort()).toEqual([
			"constant",
			"increment",
			"nested",
			"value"
		]);
		expect(Object.getOwnPropertyDescriptor(namespace, "constant").configurable).toBe(
			false
		);
	}
	expect(readConstant()).toBe(42);
	expect(readNested()).toBe(7);
	const value = first.value;
	first.increment();
	expect(second.value).toBe(value + 1);
});
