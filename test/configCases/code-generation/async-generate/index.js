import { value } from "./async-module";
import { derived } from "./sync-module";
import cssText from "./async-module.css";

it("should handle async code generation", () => {
	expect(value).toBe(42);
	expect(derived).toBe(43);
});

it("should handle async CssModule code generation", () => {
	expect(cssText).toMatch(/color:\s*red/);
});
