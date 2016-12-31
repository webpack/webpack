var should = require("should");
var ArrayMap = require("../lib/ArrayMap");

describe("ArrayMap", function() {
	var myArrayMap;

	beforeEach(function() {
		myArrayMap = new ArrayMap();
	});

	describe('get', function() {
		it('returns value for known key', function() {
			myArrayMap.set('foo', 10);
			myArrayMap.get('foo').should.be.exactly(10);
		});

		it('returns undefined for unknown key', function() {
			should(myArrayMap.get('foo')).be.undefined();
		});
	});

	describe('set', function() {
		it('returns reference to array map instance', function() {
			myArrayMap.set('foo', 10).should.be.exactly(myArrayMap);
		});

		it('sets value for new key', function() {
			myArrayMap.set('foo', 10);
			myArrayMap.get('foo').should.be.exactly(10);
		});

		it('overwrites value for existing key', function() {
			myArrayMap.set('foo', 10).set('foo', 'hello');
			myArrayMap.get('foo').should.be.exactly('hello');
		});
	});

	describe('remove', function() {
		it('removes entry for existing data', function() {
			myArrayMap.set('foo', 10);
			myArrayMap.remove('foo').should.be.exactly(true);
			should(myArrayMap.get('foo')).be.undefined();
		});

		it('does nothing for non-existant data', function() {
			myArrayMap.remove('foo').should.be.exactly(false);
			should(myArrayMap.get('foo')).be.undefined();
		});
	});

	describe('clone', function() {
		it('creates a new instance of the array map', function() {
			myArrayMap.clone().should.not.be.exactly(myArrayMap);
		});

		it('creates a new copy with no shared data', function() {
			var myArrayMap2 = myArrayMap.set('foo', 10).clone();
			myArrayMap.set('foo', 'hello');
			myArrayMap2.set('bar', 20);

			myArrayMap.get('foo').should.be.exactly('hello');
			myArrayMap2.get('foo').should.be.exactly(10);
			should(myArrayMap.get('bar')).be.undefined();
			myArrayMap2.get('bar').should.be.exactly(20);
		});
	});
});
