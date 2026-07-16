import reported from "./reported";
import suppressed from "./suppressed";

it("should silence strict-mode diagnostics only where the option disables them", () => {
	expect(suppressed.value).toBe(1);
	expect(reported.value).toBe(2);
});
