import { x } from "./barrel.js";

it("should restore imported names when a self-reexport changes", () => {
	expect(x).toBe(WATCH_STEP === "1" ? 2 : 1);
});
