import style from "lib";

it("should report a name no deferred re-export target provides", () => {
	expect(typeof style()).toBe("function");
});
