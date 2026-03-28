import { value } from "./shared";

it("should not have stale runtime chunk hash references", () => {
	expect(value).toBe(WATCH_STEP === "0" ? "shared-v0" : "shared-v1");
	expect(STATS_JSON.errors).toHaveLength(0);
});
