import used from "@alias/used";

it("should stay quiet when the option is off", () => {
	// '@alias/never' goes unmatched, so the option is the only reason nothing
	// is reported
	expect(used).toBe("used");
});
