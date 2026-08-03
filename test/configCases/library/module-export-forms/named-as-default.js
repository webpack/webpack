import { named } from "./dep";

export { named as default } from "./dep";
export const keep = "keep";

it("should re-export a named export as default", () => {
	expect(named).toBe("named");
});
