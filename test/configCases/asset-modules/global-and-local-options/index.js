import file1 from "./file-global.txt";
import file2 from "./file-local.txt";

it("should output and DATA URL and filename", () => {
	expect(file1).toMatch(/^data:text\/plain;base64,/);
	expect(file2).toMatch(/^[\da-f]{20}\.txt$/);
});
