import value from "./loader.js!./stub.js";

it("should rebuild a restored loader result when its tracked file changed", () => {
	expect(value).toBe(`tracked-${WATCH_STEP}`);
});
