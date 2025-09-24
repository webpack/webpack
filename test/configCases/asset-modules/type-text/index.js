import svg from "../_images/file.svg" with { type: "text" };

it("should receive asset source", () => {
	expect(svg).toMatch(/^<svg.+<\/svg>\s*$/);
});
