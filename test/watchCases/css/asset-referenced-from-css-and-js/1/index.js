import "./style.css";
// Now the asset is also referenced from JS; on the incremental rebuild the
// asset module is not rebuilt, so the JS source type must still be added. #20800
import file from "./file.txt";

it("should make the CSS-referenced asset available from JS after rebuild", () => {
	expect(file).toContain("file.txt");
});
