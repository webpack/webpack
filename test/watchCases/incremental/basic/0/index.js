it("should rebuild only the changed module incrementally", () => {
	expect(require("./changing").value).toBe(WATCH_STEP);
	expect(require("./stable").value).toBe("stable");
});
