import icon from "./icon.svg";
import note from "./note.txt";

it("should reach the SVG an asset/source module embeds in JS", () => {
	expect(icon).toBe(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"> <rect width="10" height="10" /> </svg>'
	);
});

it("should leave a file whose name names no language alone", () => {
	expect(note).toBe("   plain   text   names   no   language   \n");
});
