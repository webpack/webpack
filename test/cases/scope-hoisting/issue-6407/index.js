import importOne from './import-one';
import importTwo from './import-two';

it("should concatenate modules default exports and empty array values", function() {
	importOne.length.should.be.eql(2);
	(typeof importOne[0]).should.be.eql('undefined');
	(typeof importOne[1]).should.be.eql('function');
	importTwo.length.should.be.eql(2);
	(typeof importTwo[0]).should.be.eql('undefined');
	(typeof importTwo[1]).should.be.eql('function');
});
