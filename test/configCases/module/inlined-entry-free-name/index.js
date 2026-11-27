import data from "./data.json" with { type: "json" };
import { readOrigin } from "./check.js";

var origin = data;

it("should not shadow a global another module of the chunk reads", () => {
	expect(origin).toBe("from data");
	expect(readOrigin()).toBe("no origin");
});
