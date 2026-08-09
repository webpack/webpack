import first from "./first.custom";
import second from "./second.custom";

it("should prepare the module type before creating its parser", () => {
	expect(first).toBe("first");
	expect(second).toBe("second");
});
