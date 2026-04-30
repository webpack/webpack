it("should rebuild when an additional watched file changes", () => {
	expect(ADDITIONAL_FILE_CONTENT).toBe(`v${WATCH_STEP}`);
});

it("should rebuild when files in an additional watched directory change", () => {
	expect(ADDITIONAL_DIR_FILES).toEqual([`${WATCH_STEP}.txt`]);
});
