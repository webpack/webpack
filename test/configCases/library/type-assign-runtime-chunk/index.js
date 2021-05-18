it("should define global object with property", function () {
	expect(MyLibraryRuntimeChunk["answer"]).toEqual(42);
});

export const answer = 42;
