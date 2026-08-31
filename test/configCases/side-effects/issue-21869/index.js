import style from "mypkg/style";

// a strict ESM barrel reports at the error level without any parser option
it("should build the reported strict ESM barrel without a linking error", () => {
	expect(typeof style()).toBe("function");
});
