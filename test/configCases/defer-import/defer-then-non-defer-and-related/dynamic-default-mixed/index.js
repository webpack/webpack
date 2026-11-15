import { defaultValue, deferredValue } from "./reexport"

it("dynamic-default-mixed: should have correct default export with concatenation modules", () => {
	expect(defaultValue).toBe(deferredValue);
});
