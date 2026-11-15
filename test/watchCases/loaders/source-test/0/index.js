import value from "./input";

it("reevaluates the source test after each rebuild", () => {
	expect(value).toBe(Number(WATCH_STEP) % 2 === 0 ? "__VALUE__" : "transformed");
});
