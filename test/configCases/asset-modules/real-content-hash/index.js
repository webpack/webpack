import a from "../_images/file.png";
import b from "../_images/file_copy.png";

it("should use a real content hash for assets", () => {
	expect(a).toBe(b);
});
