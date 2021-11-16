import png from "../_images/file.png";
import svg from "../_images/file.svg";
import jpg from "../_images/file.jpg";

it("should output various asset types", () => {
	expect(png).toMatch(/^[\da-f]{16}\.png$/);
	expect(svg).toMatch(/^[\da-f]{16}\.svg$/);
	expect(jpg).toMatch(/^[\da-f]{16}\.jpg$/);
});
