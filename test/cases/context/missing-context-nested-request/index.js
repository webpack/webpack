const part = String("hello");

it("should keep a nested require in the request of a missing context", () => {
	expect(() => require("./missing/" + require("./value") + part)).toThrow(
		"Cannot find module"
	);
});

it("should keep a nested template request in the request of a missing context", () => {
	expect(() => require(`./missing/${require(`./${part}`)}`)).toThrow(
		"Cannot find module"
	);
});
