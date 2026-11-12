import { run } from "./consumer";

it("should keep the imports of retained local exports", () => {
	expect(run()).toBe(42);
});
