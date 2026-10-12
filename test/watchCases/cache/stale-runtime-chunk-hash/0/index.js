import { value } from "./shared";

it("should not have stale runtime chunk hash references", () => {
	expect(value).toBe(WATCH_STEP === "0" ? "shared-v0" : "shared-v1");
	expect(STATS_JSON.errors).toHaveLength(0);
});

it("should preserve the exports of the second library entry", async () => {
	const asset = STATS_JSON.assets.find(({ name }) => name.startsWith("entry2."));
	const entry = await __non_webpack_require__(`${STATS_JSON.outputPath}/${asset.name}`);
	expect(entry.default).toBe(WATCH_STEP === "0" ? "shared-v0" : "shared-v1");
});
