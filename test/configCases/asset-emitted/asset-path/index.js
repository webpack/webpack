import fs from "fs";
import path from "path";
import txt from "asset/1.txt";

it("should compile and run", () => {
	expect(fs.readFileSync(path.resolve(__dirname, "..", txt)).toString()).toMatch("text");
});
