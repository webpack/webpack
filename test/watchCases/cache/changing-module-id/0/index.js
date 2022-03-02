import value from "./module";
import value2 from "./unrelated";
import value3 from "./other-module";

it("should work when modules change ids", async () => {
	expect(value).toBe(42);
	expect(value2).toBe(42);
	expect(value3).toBe(42 + +WATCH_STEP);
	expect(import("./module?async")).resolves.toEqual(nsObj({ default: 42 }));
});
