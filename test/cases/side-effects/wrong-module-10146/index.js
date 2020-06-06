import { A } from "./module";

it("should return the correct module", () => {
	expect(A()).toEqual("A/index.js");
});
