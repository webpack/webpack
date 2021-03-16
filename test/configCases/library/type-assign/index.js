it("should define global object with property", function () {
	require("./module");
	expect(MyLibrary["answer"]).toEqual(42);
});

export const answer = 42;
