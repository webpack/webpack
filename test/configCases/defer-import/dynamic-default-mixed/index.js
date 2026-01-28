import { defaultValue, deferredValue } from "./reexport"

it("should have correct default export with concatenation modules", () => {
	expect(defaultValue).toBe(deferredValue);
});
