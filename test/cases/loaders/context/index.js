it("should be able to use a context with a loader", function() {
	var abc = "abc",
		scr = "script.coffee";
	expect(require("../_resources/" + scr)).toBe("coffee test");
	expect(require("raw-loader!../_resources/" + abc + ".txt").default).toBe(
		"abc"
	);
});
