import log from "./log";
import { load } from "./lib";

it("should keep an unused re-export from swallowing the next statement", () => {
	expect(load()).toBe("loaded");
});

it("should still evaluate what an unused re-export required", () => {
	expect(log).toEqual(["type", "schema", "defaults", "failsafe", "json"]);
});
