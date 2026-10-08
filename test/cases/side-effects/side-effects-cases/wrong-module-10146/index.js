import { A } from "./module";

it("wrong-module-10146: should return the correct module", () => {
	expect(A()).toEqual("A/index.js");
});
