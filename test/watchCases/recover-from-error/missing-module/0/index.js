it("should recover from missing module", function() {
	switch(WATCH_STEP) {
		case "0":
			expect(function() {
				require("some-module");
			}).toThrow();
			break;
		case "1":
			expect(require("some-module")).toBe("ok");
			break;
	}
});
