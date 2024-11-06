import url from "./loader!!";
import {url as url2} from "./module1";

it("should compile and run", () => {
	expect(url).toBe("webpack:///a.txt");
	expect(url2.toString()).toMatch(/^file:/);
});
