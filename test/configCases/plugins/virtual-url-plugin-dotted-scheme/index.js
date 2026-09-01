import { answer } from "x.y.z:answer";
import { greeting } from "vnd.acme:greeting";

it("should resolve a scheme containing a dot", () => {
	expect(greeting).toBe("from a dotted scheme");
});

it("should resolve a scheme containing several dots", () => {
	expect(answer).toBe(42);
});
