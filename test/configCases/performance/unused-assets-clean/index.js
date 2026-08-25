import read from "../../asset-modules/_images/file.png";

// Bare, so the file is wanted regardless — not something to report.
import "../../asset-modules/_images/file.svg";

it("should report nothing when every asset is read or asked for bare", () => {
	expect(read).toMatch(/file\.png$/);
	expect(
		__STATS__.assets.some((asset) => asset.name === "file.svg")
	).toBe(true);
	expect(__STATS__.warnings).toHaveLength(0);
});
