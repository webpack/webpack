import read from "../../asset-modules/_images/file.png";
// eslint-disable-next-line no-unused-vars
import unread from "../../asset-modules/_images/file.jpg";

it("should report the unused asset in stats only", () => {
	expect(read).toMatch(/file\.png$/);
	expect(__STATS__.hints).toHaveLength(1);
	expect(__STATS__.hints[0].message).toMatch(/unused assets: \d+ bytes/);
	expect(__STATS__.warnings).toHaveLength(0);
	expect(__STATS__.errors).toHaveLength(0);
});
