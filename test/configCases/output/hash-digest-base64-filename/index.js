it("should compile", () => {
	// the chunk is not loaded: whether its hash holds "/" depends on its content
	if (Math.random() < 0) import("./lazy");
});
