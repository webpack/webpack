import value from "./value";

it("should keep the hash for an unchanged rebuild and never return to an old one", () => {
	expect(value).toBe([1, 1, 2, 1, 2, 2][Number(WATCH_STEP)]);
	if (WATCH_STEP === "0") STATE.hashes = [];
	const hashes = STATE.hashes;
	hashes.push(STATS_JSON.hash);
	switch (WATCH_STEP) {
		case "1":
		case "5":
			// Rewritten with the same text: nothing to update.
			expect(hashes[hashes.length - 1]).toBe(hashes[hashes.length - 2]);
			break;
		case "3":
		case "4":
			// Back to an earlier source, but the update chain makes it a new state.
			expect(new Set(hashes).size).toBe(hashes.length - 1);
			break;
		case "2":
			expect(hashes[2]).not.toBe(hashes[1]);
			break;
	}
});
