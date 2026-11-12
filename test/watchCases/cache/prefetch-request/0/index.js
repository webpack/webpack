import tick from "./tick";

it("should build after replacing and deleting a prefetched module", () => {
	expect(tick).toBe(WATCH_STEP);
});
