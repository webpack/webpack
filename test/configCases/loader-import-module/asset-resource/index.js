import resource from "./file.txt?resource";
import inline from "./file.txt?inline";

it("should return the url of an asset/resource module from importModule", () => {
	expect(resource).toBe("/public/assets/file.txt");
});

it("should return the data url of an asset/inline module from importModule", () => {
	expect(inline).toBe("data:text/plain;base64,YXNzZXQK");
});
