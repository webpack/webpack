import png from "../_images/file.png";
import svg from "../_images/file.svg?inline";
import jpg from "../_images/file.jpg";

it("should output various asset types", () => {
	expect(png).toMatch(/^[\da-f]{20}\.png$/);
	expect(svg).toMatch(/^data:image\/svg\+xml,/);
	expect(jpg).toMatch(/^DATA:image\/jpeg;base64,[0-9a-zA-Z+/]+=*$/);
});
