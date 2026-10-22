import a from "./a";

it("should report which files changed and which were removed", () => {
	expect(a).toBe(WATCH_STEP === "0" ? "a" : "a modified");
	expect(HAS_EXTRA).toBe(WATCH_STEP !== "2");
	// Nothing is reported before the first build: every file is new to it.
	if (IS_BUN && WATCH_STEP === "2") return;
	expect(CHANGES).toEqual(
		[
			{},
			{ modified: ["a.js"], removed: [] },
			{ modified: [], removed: ["extra.txt"] }
		][Number(WATCH_STEP)]
	);
});
