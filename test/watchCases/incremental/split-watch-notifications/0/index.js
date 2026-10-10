it("should wait for the file notification when its directory changes first", () => {
	expect(FILE_CHANGE_REPORTED).toBe(WATCH_STEP === "1");
});
