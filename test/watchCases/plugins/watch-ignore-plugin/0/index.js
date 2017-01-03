import value from "./file"
import a from "./a"
const req = require.context("./foo", false, /^.*\.js$/);
it("should ignore change to file and directory", function() {
	a.should.be.eql(+WATCH_STEP);
	req.keys().should.be.deepEqual(["./0.js"])
	value.should.be.eql(1);
});
