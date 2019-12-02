import png from "../_images/file.png";
import svg from "../_images/file.svg";
import jpg from "../_images/file.jpg";

it("should generate various asset types by a custom encoder", () => {
	expect(png).toMatch(/^data:image\/png;base64,[0-9a-zA-Z+/]+=*$/);
	expect(jpg).toMatch(/^[\da-f]{20}\.jpg$/);
	expect(svg).toMatch(/^[\da-f]{20}\.svg$/);
});
