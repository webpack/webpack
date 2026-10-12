import { a } from "./barrel";

it("should follow a re-export retarget across rebuilds", () => {
	expect(a).toBe(WATCH_STEP === "0" ? 1 : 2);
});
