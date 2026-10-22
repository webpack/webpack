import { getNamed } from "./helper";

export const keep = "keep";
export default { named: getNamed() };

it("should export an expression as default", () => {
	expect(getNamed()).toBe("named");
});
