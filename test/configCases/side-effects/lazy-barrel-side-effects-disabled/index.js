import style from "lib";

it("should check a barrel eagerly when the sideEffects optimization is off", () => {
	expect(typeof style()).toBe("function");
});
