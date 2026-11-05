import { a } from "./barrel";

it("should follow a changed re-export target across rebuilds", () => {
	expect(a).toBe(WATCH_STEP === "0" ? 1 : 2);
});
