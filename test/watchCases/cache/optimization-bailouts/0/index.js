import value from "./value";
import tick from "./tick";

it("keeps module output current while replacing optimization diagnostics", () => {
	expect(value).toBe(42);
	expect(tick).toBe(Number(WATCH_STEP));
});
