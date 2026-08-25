import one from "./one.css";
import two from "./two.css";

/**
 * @param {string} text minified CSS carrying an inline source map
 * @returns {EXPECTED_ANY} the decoded map
 */
const inlineMap = (text) => {
	const match = /sourceMappingURL=data:application\/json;charset=utf-8;base64,([A-Za-z0-9+/=]+)/.exec(
		text
	);
	expect(match).not.toBe(null);
	return JSON.parse(
		Buffer.from(/** @type {RegExpExecArray} */ (match)[1], "base64").toString(
			"utf8"
		)
	);
};

it("should give each module its own map, not the one beside it", () => {
	// Both files hold byte-identical CSS: a resolved source cached by text alone
	// would hand one module the other's map.
	expect(one).toContain(".a{color:red;margin:10px}");
	expect(two).toContain(".a{color:red;margin:10px}");
	expect(inlineMap(one).sources).toEqual(["webpack:///./one.css"]);
	expect(inlineMap(two).sources).toEqual(["webpack:///./two.css"]);
});

it("should map the minified text back to the original CSS", () => {
	const map = inlineMap(one);
	expect(map.sourcesContent).toEqual([
		".a {\n\tcolor : red ;\n\tmargin : 10px 10px 10px 10px ;\n}\n"
	]);
	expect(map.mappings.length).toBeGreaterThan(0);
});
