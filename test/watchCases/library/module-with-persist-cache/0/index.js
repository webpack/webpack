import "./sibling.js";
export const answer = 42;
export function twice() {
	return answer * 2;
}

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should retain module library exports after a cached rebuild", () => {
	const source = fs.readFileSync(
		path.join(STATS_JSON.outputPath, "bundle.mjs"),
		"utf8"
	);

	["answer", "twice"].forEach((binding) => {
		expect(source).toContain(`${binding}: () => (/* binding */ ${binding})`);
	});
});
