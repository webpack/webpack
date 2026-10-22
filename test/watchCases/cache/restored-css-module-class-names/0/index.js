import names from "./consumer";

// The class names are the keys consumers read, so a restored mapping can go stale.
it("should refresh the class names a restored CSS module exports", () => {
	expect(names).toEqual([["alpha"], ["beta"], ["alpha"]][Number(WATCH_STEP)]);
});
