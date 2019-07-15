import png from "../_images/file.png";
import svg from "../_images/file.svg";
import jpg from "../_images/file.jpg";

it("should output various asset types", () => {
	expect(png).toEqual("83d6dab543c538e6621f.png");
	expect(svg).toEqual("7c14c134bd6b6bedc352.svg");
	expect(jpg).toEqual("00891fd33cfbdc56d145.jpg");
});
