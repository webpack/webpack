import style from "lib";

it("should still report a name no deferred re-export target provides", () => {
	expect(typeof style()).toBe("function");
});
