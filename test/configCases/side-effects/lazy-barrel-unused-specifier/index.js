import style from "lib";

it("should not report a missing export for a barrel binding dropped by DCE", () => {
	expect(typeof style()).toBe("function");
});
