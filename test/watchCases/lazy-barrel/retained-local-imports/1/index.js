import { run } from "./consumer";

it("should keep the imports of retained local exports after an entry edit", () => {
	expect(run()).toBe(Number(WATCH_STEP) === 1 ? 42 : 43);
});
