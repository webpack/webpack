var should = require("should");
var RawModule = require("../lib/RawModule");
var OriginalSource = require("webpack-sources").OriginalSource;
var RawSource = require("webpack-sources").RawSource;

describe("RawModule", function() {
	var myRawModule;

	beforeEach(function() {
		var source = 'sourceStr attribute';
		var identifier = 'identifierStr attribute';
		var readableIdentifier = 'readableIdentifierStr attribute';
		myRawModule = new RawModule(source, identifier, readableIdentifier);
	});

	describe('identifier', function() {
		it('returns value for identifierStr attribute', function() {
			should(myRawModule.identifier()).be.exactly('identifierStr attribute');
		});
	});

	describe('size', function() {
		it('returns value for sourceStr attribute\'s length property', function() {
			should(myRawModule.size()).be.exactly(19);
		});
	});

	describe('readableIdentifier', function() {
		it('returns result of calling provided requestShortener\'s shorten method\
     on readableIdentifierStr attribute', function() {
			should(myRawModule.readableIdentifier()).exist();
		});
	});

	describe('needRebuild', function() {
		it('returns false', function() {
			should(myRawModule.needRebuild()).be.false();
		});
	});

	describe('build', function() {
		it('sets builtTime attribute to current time value in milliseconds', function() {
			myRawModule.build('', '', '', '', () => {
				undefined
			})
			var currentTime = new Date().getTime();
			myRawModule.builtTime.should.be.exactly(currentTime)
		});
	});

	describe('source', function() {
		it('returns a new OriginalSource instance with sourceStr attribute and\
        return value of identifier() function provided as constructor arguments',
			function() {
				/* TODO */
			});

		it('returns a new RawSource instance with sourceStr attribute provided\
        as constructor argument if useSourceMap is falsey', function() {
			/* TODO */
		});
	});
});
