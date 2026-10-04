it("should rebuild only the changed module incrementally", () => {
	expect(require("./changing").value).toBe(WATCH_STEP);
	expect(require("./stable").value).toBe("stable");
	expect(
		STATS_JSON.modules
			.filter((module) => module.built)
			.map((module) => module.name)
			.sort()
	).toEqual(
		[
			["./changing.js", "./index.js", "./stable.js"],
			["./changing.js"],
			["./added.js", "./changing.js"]
		][Number(WATCH_STEP)]
	);
});
