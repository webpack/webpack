import png from "../_images/file.png";
import svg from "../_images/file.svg?foo=bar";
import jpg from "../_images/file.jpg";

it("should output various asset types", () => {
	expect(png).toMatch(/^data:image\/png;base64,[0-9a-zA-Z+/]+=*$/);
	expect(svg).toMatch(/^data:image\/svg\+xml,/);
	expect(jpg).toMatch(/^data:image\/jpeg;base64,[0-9a-zA-Z+/]+=*$/);
});
