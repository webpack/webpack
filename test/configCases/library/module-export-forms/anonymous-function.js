import { getNamed } from "./helper";

export const keep = "keep";
export default function () {
	return getNamed();
}

it("should export an anonymous function declaration as default", () => {
	expect(getNamed()).toBe("named");
});
