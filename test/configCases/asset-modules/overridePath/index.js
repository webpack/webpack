import url from "../_images/file.png";
import index from "../_static/file.html";

it("should output asset with path", () => {
	expect(url).toEqual("images/file.png");
	expect(index).toEqual("static/index.html");
});
