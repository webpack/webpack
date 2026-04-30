it("should rebuild when entries matching the glob are added, removed and re-added", () => {
	if (WATCH_STEP === "0") {
		expect(DYNAMIC_ENTRIES).toEqual(["a.txt"]);
	} else if (WATCH_STEP === "1") {
		expect(DYNAMIC_ENTRIES).toEqual(["a.txt", "b.txt", "sub-dir/"]);
	} else if (WATCH_STEP === "2") {
		expect(DYNAMIC_ENTRIES).toEqual([]);
	} else if (WATCH_STEP === "3") {
		expect(DYNAMIC_ENTRIES).toEqual(["c.txt", "d.txt"]);
	}
});
