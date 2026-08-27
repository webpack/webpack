import value from "./loader!";

it("should rebuild when an optional build dependency is added or removed", () => {
	const step = +WATCH_STEP;
	if (step === 0) {
		expect(value).toBe("absent");
	} else if (step === 1) {
		expect(value).toBe("present");
	} else if (step === 2) {
		expect(value).toBe("absent");
	}
});
