it("should run the rebuild's task on the thread of the first build", () => {
	expect(SAME_THREAD).toBe(true);
});

it("should release the thread the first build did not use", () => {
	expect(TRIMMED).toBe(true);
});
