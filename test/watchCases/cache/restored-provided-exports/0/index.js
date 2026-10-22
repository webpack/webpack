import keys from "./consumer";

// Provided exports are stored per build hash; a restored provider may report old ones.
it("should see exports a restored provider gained", () => {
	expect(keys).toEqual(
		[["BASE"], ["BASE", "SECOND"], ["BASE", "THIRD"]][Number(WATCH_STEP)]
	);
});
