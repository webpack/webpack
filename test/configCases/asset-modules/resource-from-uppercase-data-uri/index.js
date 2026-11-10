import lower from "data:text/plain,folder/file.txt";
import upper from "DATA:text/plain,folder/file.txt";
import mixed from "Data:text/plain,other/file.txt";

it("should name an asset from a data URI whatever the scheme's case", () => {
	expect(lower).toMatch(/^public\/media\/[0-9a-f]+\.txt$/);
	expect(upper).toBe(lower);
	expect(mixed).toMatch(/^public\/media\/[0-9a-f]+\.txt$/);
});
