import url from "../_images/file.png";

it("should interpolate [fullhash] and [fullhash:N] placeholders in output.publicPath", () => {
	const match = url.match(
		/^out\/([a-f0-9]+)\/([a-f0-9]{8})\/([a-f0-9]{6})\/file\.png$/
	);
	expect(match).not.toBeNull();
	const [, full, full8, full6] = /** @type {RegExpMatchArray} */ (match);
	expect(full.startsWith(full8)).toBe(true);
	expect(full.startsWith(full6)).toBe(true);
});
