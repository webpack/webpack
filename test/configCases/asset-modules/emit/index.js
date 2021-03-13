import url from "../_images/file.png";
import fs from "fs";

it("should output asset with path", () => {
	expect(url).toEqual("images/file.png");
	expect(() => fs.statSync(url)).toThrowError(
		expect.objectContaining({
			code: "ENOENT"
		})
	);
});
