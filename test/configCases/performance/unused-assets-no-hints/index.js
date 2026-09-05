import read from "../../asset-modules/_images/file.png";
// eslint-disable-next-line no-unused-vars
import unread from "../../asset-modules/_images/file.jpg";

it("should report nothing when hints are off", () => {
	expect(read).toMatch(/file\.png$/);
	expect(__STATS__.hints).toHaveLength(0);
	expect(__STATS__.warnings).toHaveLength(0);
});
