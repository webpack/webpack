function testCase(number) {
	expect(require(number === 1 ? "./folder/file1" : number === 2 ? "./folder/file2" : number === 3 ? "./folder/file3" : "./missingModule")).toBe("file" + number);
	expect(require(
		number === 1 ? "./folder/file1" :
		number === 2 ? "./folder/file2" :
		number === 3 ? "./folder/file3" :
		"./missingModule"
	)).toBe("file" + number);
}


it("should throw an error on missing module at runtime, but not at compile time if in try block", function() {
	var error = null;
	try {
		testCase(4); // indirect
	} catch(e) {
		error = e;
	}
	expect(error).toBeInstanceOf(Error);

	error = null;
	try {
		require("./missingModule2"); // direct
	} catch(e) {
		error = e;
	}
	expect(error).toBeInstanceOf(Error);
});
