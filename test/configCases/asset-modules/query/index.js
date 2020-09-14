import png from "../_images/file.png?foo=bar";
import svg from "../_images/file.svg?";
import jpg from "../_images/file.jpg?foo=bar#hash";

it("should output various asset types", () => {
	expect(png).toMatch(/^[\da-f]{20}\.png\?foo=bar$/);
	expect(svg).toMatch(/^[\da-f]{20}\.svg\?$/);
	expect(jpg).toMatch(/^[\da-f]{20}\.jpg\?foo=bar$/);
});
