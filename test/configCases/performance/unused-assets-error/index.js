import read from "../../asset-modules/_images/file.png";
// eslint-disable-next-line no-unused-vars
import unread from "../../asset-modules/_images/file.jpg";

// Bare: the file is wanted on disk, which is all the import can be for.
import "../../asset-modules/_images/file.svg";

it("should report the unused asset as an error", () => {
	expect(read).toMatch(/file\.png$/);
	expect(
		__STATS__.assets.some((asset) => asset.name === "file.svg")
	).toBe(true);
});
