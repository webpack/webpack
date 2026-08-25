import read from "../../asset-modules/_images/file.png";
// eslint-disable-next-line no-unused-vars
import unread from "../../asset-modules/_images/file.jpg";

it("should report nothing when the unread asset is inlined", () => {
	// Inlined, so there is no file of its own — the wasted bytes are the
	// importer's and 'inlinedAssets' is the check that speaks about them.
	expect(read).toMatch(/^data:/);
	expect(__STATS__.warnings).toHaveLength(0);
});
