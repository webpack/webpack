import { N } from "./dep";

const fs = __non_webpack_require__("fs");

it("should read the value binding back", () => {
	expect(N).toBe(42);
});

it("should keep the array branch of __webpack_require__.d", () => {
	expect(runtimeBody()).toMatchSnapshot();
});

// The whole `__webpack_require__.d` body, so which branches it carries is
// reviewed as one diff rather than pinned by a substring.
function runtimeBody() {
	const lines = fs
		.readFileSync(__filename, "utf-8")
		.split("\n")
		.map(line => line.replace(/^\/\*+\/\s?/, "").trimEnd());
	const start = lines.findIndex(line =>
		line.trim().startsWith("__webpack_require__.d = ")
	);
	const end = lines.findIndex(
		(line, i) => i > start && line.trim() === "};"
	);
	return lines.slice(start, end + 1);
}
