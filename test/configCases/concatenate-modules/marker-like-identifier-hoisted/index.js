import { kind, sum } from "./module";

it("should keep the text after an identifier spelled like a module reference", () => {
	expect(kind).toBe("object");
	expect(sum).toBe(2);
});
