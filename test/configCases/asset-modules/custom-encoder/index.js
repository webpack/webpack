import png from "../_images/file.png";
import svg from "../_images/file.svg";
import jpg from "../_images/file.jpg";

it("should generate various asset types by a custom encoder", () => {
	expect(png).toMatch(/^data:mimetype\/png;base64,[0-9a-zA-Z+/]+=*$/);
	expect(jpg).toEqual("data:image/jpg;base64,custom-content");
	expect(svg).toMatch(/^data:image\/svg\+xml,/);
});
