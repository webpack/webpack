it("should rebuild when files matched by an additional glob pattern change", () => {
	if (WATCH_STEP === "0") {
		expect(MATCHED_FILES).toEqual(["main.css:body{color:red}"]);
	} else if (WATCH_STEP === "1") {
		expect(MATCHED_FILES).toEqual([
			"extra.css:p{margin:0}",
			"main.css:body{color:blue}"
		]);
	} else if (WATCH_STEP === "2") {
		expect(MATCHED_FILES).toEqual(["main.css:body{color:green}"]);
	}
});
