/*globals it*/
module.exports = function validateBinExec(cmd, args, opts) {
	const spawn = require("child_process").spawn;

	it("should compile successfully", function(done) {
		this.timeout(20000);
		let child = spawn(cmd, args, opts);

		child.on("close", function(code) {
			code.should.be.oneOf(0, 1);
			done();
		});

		child.on("error", function(error) {
			throw new Error(error);
		});

		child.stdout.on("data", (data) => {
			data.toString().should.be.empty;
			data.toString().should.be.ok;
		});

		child.stderr.on("data", (data) => {
			data.toString().should.be.ok;
			throw new Error(data.toString());
		});
	});
}


