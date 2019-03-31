import png from "../../../fixtures/images/file.png";
import svg from "../../../fixtures/images/file.svg";
import jpg from "../../../fixtures/images/file.jpg";

it("should output various asset types", () => {
	expect(png).toEqual("2d9ebaf470317beef59d.png");
	expect(svg).toEqual("465a1a1888291fae20b4.svg");
	expect(jpg).toEqual("7f0155971180b70c18c4.jpg");
});
