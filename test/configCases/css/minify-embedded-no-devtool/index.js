import text from "./style.css";

it("should keep a tap's map out of a build that asked for none", () => {
	expect(text).toContain(".a{color:red}");
	// `devtool: false` means no map anywhere — an inlined one would also ship
	// every original stylesheet inside the bundle.
	expect(text).not.toContain("sourceMappingURL");
	expect(text).not.toContain("sourcesContent");
});
