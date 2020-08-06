import png from "../_images/file.png?foo=bar";
import svg from "../_images/file.svg";
import jpg from "../_images/file.jpg?foo=bar#hash";

it("should output various asset types", () => {
	expect(png).toContain("data:image/png;base64,");
	expect(svg).toMatch(/^[\da-f]{20}\.svg$/);
	expect(jpg).toContain("data:image/jpeg;base64,");
});
