import { getNamed } from "./helper";

export const keep = "keep";
export default class {
	value() {
		return getNamed();
	}
}

it("should export an anonymous class as default", () => {
	expect(getNamed()).toBe("named");
});
