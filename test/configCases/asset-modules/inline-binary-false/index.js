import svg from "../_images/file.svg";

it("should inline a non-binary asset with encoding: false", () => {
	// Regression: a string-backed source previously produced "data:...,undefined"
	expect(svg).toMatch(/^data:image\/svg\+xml,/);
	expect(svg).not.toContain("undefined");
	expect(svg).toContain("%3Csvg");
});
