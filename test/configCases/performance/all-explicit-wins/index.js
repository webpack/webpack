import { used } from "./barrel";

it("should let an explicit check override 'all'", () => {
	expect(used).toBe(2);
	// `all` is only a fallback, so the one set by hand still wins.
	expect(
		__STATS__.hints.filter((hint) => /unused re-exports:/.test(hint.message))
	).toHaveLength(0);
});
