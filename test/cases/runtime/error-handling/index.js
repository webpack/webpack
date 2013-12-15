function testCase(number) {
	require(number === 1 ? "./folder/file1" : number === 2 ? "./folder/file2" : number === 3 ? "./folder/file3" : "./missingModule").should.be.eql("file" + number);
	require(
		number === 1 ? "./folder/file1" :
		number === 2 ? "./folder/file2" :
		number === 3 ? "./folder/file3" :
		"./missingModule"
	).should.be.eql("file" + number);
}


it("should throw an error on missing module at runtime, but not at compile time if in try block", function() {
	var error = null;
	try {
		testCase(4); // indirect
	} catch(e) {
		error = e;
	}
	error.should.be.instanceOf(Error);

	error = null;
	try {
		require("./missingModule2"); // direct
	} catch(e) {
		error = e;
	}
	error.should.be.instanceOf(Error);
});
