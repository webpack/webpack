import png from "../../../fixtures/images/file.png";
import svg from "../../../fixtures/images/file.svg";
import jpg from "../../../fixtures/images/file.jpg";

it("should output various asset types", () => {
	expect(png).toEqual("990800716314551ab975.png");
	expect(svg).toEqual("6003210f173dc7ede7a6.svg");
	expect(jpg).toEqual("6c5cbdb49c76fee87d12.jpg");
});
