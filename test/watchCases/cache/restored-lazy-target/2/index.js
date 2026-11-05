import { local, child } from "./parent";

it("should reconnect the target restored from the unsafe cache", () => {
	expect([local, child]).toEqual(["local", "child"]);
	expect(STATS_JSON.modules.find((module) => module.name === "./parent.js").built).toBe(false);
});
