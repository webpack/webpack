import "./style.css";
import content from "./file.txt";

it("should expose asset/source content to JS after incremental rebuild", () => {
	expect(content).toContain("asset-source-content");
});
