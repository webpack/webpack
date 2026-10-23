import resource from "./file.png?resource";
import inline from "./file.png?inline";

it("should return the url of an asset/resource module from importModule", () => {
	expect(resource).toBe("/public/assets/file.png");
});

it("should return the data url of an asset/inline module from importModule", () => {
	expect(inline).toMatch(/^data:image\/png;base64,/);
});
