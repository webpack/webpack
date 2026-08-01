import { g } from "./a";

it("should include a module the inner graph newly activates", () => {
	expect(g()).toBe(WATCH_STEP === "0" ? 1 : "X");
});
