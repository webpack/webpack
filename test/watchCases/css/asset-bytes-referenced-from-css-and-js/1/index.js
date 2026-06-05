import "./style.css";
import file from "./file.txt";

it("should expose asset/bytes content to JS after incremental rebuild", () => {
	const text = new TextDecoder("utf-8").decode(file);
	expect(text).toContain("asset-bytes-content");
});
