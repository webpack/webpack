import module from "./changing-module";

it("should watch for changes", function () {
	expect(require("./changing-file")).toBe(WATCH_STEP);
	expect(module).toBe(WATCH_STEP);
});
