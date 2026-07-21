"use strict";

const {
	PLACEHOLDER_REGEXP,
	PUBLIC_PATH_PLACEHOLDER,
	chunkFilenamePlaceholder,
	isFullHashOnlyTemplate
} = require("../lib/esm/analyzableEsmPlaceholders");

describe("analyzableEsmPlaceholders", () => {
	it("should encode chunk ids uniquely and string-literal-safe", () => {
		const ids = [0, 1, "main", "1", 1.5, 'chunk~a/b\\c"d', "id+with/base64="];
		const tokens = ids.map((id) => chunkFilenamePlaceholder(id));
		expect(new Set(tokens).size).toBe(ids.length);
		for (const token of tokens) {
			// safe inside a double-quoted literal and stable through JSON.stringify
			expect(JSON.stringify(token)).toBe(`"${token}"`);
			expect(token.match(PLACEHOLDER_REGEXP)).toEqual([token]);
		}
	});

	it("should match adjacent publicPath and chunk tokens separately", () => {
		const chunkToken = chunkFilenamePlaceholder("dynamic");
		const content = `import("${PUBLIC_PATH_PLACEHOLDER}${chunkToken}")`;
		expect(content.match(PLACEHOLDER_REGEXP)).toEqual([
			PUBLIC_PATH_PLACEHOLDER,
			chunkToken
		]);
	});

	it("should accept only fullhash-family template tokens", () => {
		expect(isFullHashOnlyTemplate("/assets/")).toBe(true);
		expect(isFullHashOnlyTemplate("/assets/[fullhash]/")).toBe(true);
		expect(isFullHashOnlyTemplate("/a/[hash]/[fullhash:8]/")).toBe(true);
		expect(isFullHashOnlyTemplate("/assets/[contenthash]/")).toBe(false);
		expect(isFullHashOnlyTemplate("/[fullhash]/[name]/")).toBe(false);
		expect(isFullHashOnlyTemplate("/[chunkhash]/")).toBe(false);
	});
});
