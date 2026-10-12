import value from "./value.txt";

it("should prepare retained module types before rebuilding", () => {
	expect(value.trim()).toBe(WATCH_STEP === "1" ? "first" : "second");
});
