import rcdata from "./rcdata.html";
import rawtext from "./rawtext.html";
import scriptdata from "./scriptdata.html";
import plaintext from "./plaintext.html";

it("should parse fragments using RCDATA, RAWTEXT, script-data and plaintext modes", () => {
	expect(rcdata).toMatchSnapshot();
	expect(rawtext).toMatchSnapshot();
	expect(scriptdata).toMatchSnapshot();
	expect(plaintext).toMatchSnapshot();
});
