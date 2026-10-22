import { present } from "./mid";

export { present, missing } from "./mid";

it("should not reexport a name missing behind a property path", () => {
	expect(present).toBe(1);
});
