const url = require("../_images/file.png?size=2#frag");
const inlined = require("../_images/file.png?inline#frag");

it("should keep the query and fragment through a rename", () => {
	expect(url).toMatch(/file\.webp\?size=2#frag$/);
});

it("should read the media type past a fragment", () => {
	expect(inlined).toMatch(/^data:image\/webp;base64,/);
});

it("should read the media type when a fragment carries no query", () => {
	expect(require("../_images/file.png#inline")).toMatch(
		/^data:image\/webp;base64,/,
	);
});
