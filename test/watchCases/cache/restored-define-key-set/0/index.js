const values = [
	typeof FIRST === "undefined" ? "none" : FIRST,
	typeof SECOND === "undefined" ? "none" : SECOND
];

// The key set is hashed apart from each value, so adding one invalidates the rest.
it("should re-substitute when the define key set changes", () => {
	expect(values).toEqual(
		[
			["one", "none"],
			["one", "two"],
			["none", "two"]
		][Number(WATCH_STEP)]
	);
});
