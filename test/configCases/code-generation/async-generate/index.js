import { value } from "./async-module";
import { derived } from "./sync-module";

it("should handle async code generation", () => {
	expect(value).toBe(42);
	expect(derived).toBe(43);
});
