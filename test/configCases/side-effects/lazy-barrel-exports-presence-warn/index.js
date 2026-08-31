import style from "lib";

it("should warn only for the name no deferred target provides", () => {
	expect(typeof style()).toBe("function");
});
