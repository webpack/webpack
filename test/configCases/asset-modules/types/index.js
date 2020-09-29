import png from "../_images/file.png";
import svg from "../_images/file.svg";
import jpg from "../_images/file.jpg";

it("should output various asset types", () => {
	expect(png).toMatch(/^[\da-f]{20}\.png$/);
	expect(svg).toMatch(/^[\da-f]{20}\.svg$/);
	expect(jpg).toMatch(/^[\da-f]{20}\.jpg$/);
});
