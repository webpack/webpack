import { getValue } from "./module";

const localDecl = 1;

it("should compile and run", () => {
	expect(getValue() + localDecl).toBe(43);
});
