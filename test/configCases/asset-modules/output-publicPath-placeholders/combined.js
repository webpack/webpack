import url from "../_images/file.png";

it("should interpolate multiple [fullhash] and [fullhash:N] in output.publicPath", () => {
	const match = url.match(
		/^c\/([a-f0-9]+)\/sub\/([a-f0-9]{6})\/file\.png$/
	);
	expect(match).not.toBeNull();
	const [, full, full6] = /** @type {RegExpMatchArray} */ (match);
	expect(full.startsWith(full6)).toBe(true);
});
