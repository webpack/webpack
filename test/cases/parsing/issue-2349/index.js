import {x} from './a' // named imported cases an errors

it("should be able to import a named export", function() {
	x.should.be.eql(1);
});
