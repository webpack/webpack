it("should define global object with property", function () {
	expect(MyLibrary["answer"]).toEqual(42);
});

export default {
	answer: 42
};
