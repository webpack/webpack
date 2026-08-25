import { loaded } from "./dynamic";

it("should load a chunk the runtime learned to load only now", async () => {
	expect(await loaded).toBe(WATCH_STEP === "0" ? "none" : "late");
});
