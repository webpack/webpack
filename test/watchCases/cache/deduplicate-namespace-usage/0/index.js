import { getFirst } from "./first.js";
import { getSecond } from "./second.js";

it("should update repeated namespace escapes when exports change", () => {
	for (const namespace of [getFirst(), getSecond()]) {
		expect(namespace.value).toBe([1, 2, 4][Number(WATCH_STEP)]);
		expect(Object.keys(namespace).sort()).toEqual(
			WATCH_STEP === "1" ? ["added", "value"] : ["value"]
		);
		if (WATCH_STEP === "1") expect(namespace.added).toBe(3);
		expect(namespace.__esModule).toBe(true);
		expect(Object.getOwnPropertyDescriptor(namespace, "value").configurable).toBe(
			false
		);
	}
});
