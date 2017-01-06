var RawModule = require("../lib/RawModule");
var OriginalSource = require("webpack-sources").OriginalSource;
var RawSource = require("webpack-sources").RawSource;
var RequestShortener = require("../lib/RequestShortener");
var should = require("should");
var path = require("path")

describe("RawModule", function() {
	var myRawModule;

	before(function() {
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
			var sourceStrLength = myRawModule.sourceStr.length;
			should(myRawModule.size()).be.exactly(sourceStrLength);
		});
	});

	describe('readableIdentifier', function() {
		it('returns result of calling provided requestShortener\'s shorten method\
     on readableIdentifierStr attribute', function() {
			var requestShortener = new RequestShortener(path.resolve());
			should.exist(myRawModule.readableIdentifier(requestShortener));
		});
	});

	describe('needRebuild', function() {
		it('returns false', function() {
			should(myRawModule.needRebuild()).be.false();
		});
	});

	describe('source', function() {
		it('returns a new OriginalSource instance with sourceStr attribute and\
        return value of identifier() function provided as constructor arguments',
			function() {
				var originalSource = new OriginalSource(myRawModule.sourceStr, myRawModule.identifier());
				myRawModule.useSourceMap = true;
				myRawModule.source().should.match(originalSource);
			});

		it('returns a new RawSource instance with sourceStr attribute provided\
        as constructor argument if useSourceMap is falsey', function() {
			var rawSource = new RawSource(myRawModule.sourceStr);
			myRawModule.useSourceMap = false;
			myRawModule.source().should.match(rawSource);
		});
	});
});
