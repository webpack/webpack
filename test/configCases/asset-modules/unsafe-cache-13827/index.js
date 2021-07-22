import url from "package";

it("should create a data url", () => {
	expect(url.protocol).toBe("data:");
});
