import log from "./log";
import { shapes } from "./user.mjs";

it("should keep every reference into a wrapped module a separate statement", () => {
	expect(shapes()).toEqual(["start", "end"]);
});

it("should call the wrapped module's export once per reference", () => {
	expect(log).toEqual(["thing", "named", "named"]);
});
