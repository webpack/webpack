import svg from "../_images/file.svg";

it("should receive asset source", () => {
	expect(svg).toMatch(/^<svg.+<\/svg>\s*$/);
});
