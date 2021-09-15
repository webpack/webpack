import {val1, val2} from "./temp/index.js";
import expected from "./src with spaces/module";

it("file url request should be supported", () => {
	expect(val1).toBe(expected);
	expect(val2).toBe(expected);
});
