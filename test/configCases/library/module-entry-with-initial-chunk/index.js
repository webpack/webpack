import "./side";

export const keep = "keep";
export default "main";

it("should define the export helpers the entry factory reads", () => {
	expect(keep).toBe("keep");
});
