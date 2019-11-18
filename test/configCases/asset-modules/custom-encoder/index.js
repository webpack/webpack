import png from "../_images/file.png";
import svg from "../_images/file.svg";
import jpg from "../_images/file.jpg";

it("should generate various asset types by a custom encoder", () => {
	expect(png).toEqual("83d6dab543c538e6621f.png");
	expect(jpg).toEqual("00891fd33cfbdc56d145.jpg");
	expect(svg).toEqual("data:image/svg+xml;base64,custom-content");
});
