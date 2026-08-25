import icon from "./icon.svg";
import note from "./note.txt";

it("should reach the text an asset/source module embeds in JS", () => {
	expect(icon).toMatchSnapshot();
});

it("should leave a file whose name names no language alone", () => {
	expect(note).toBe("   plain   text   names   no   language   \n");
});
