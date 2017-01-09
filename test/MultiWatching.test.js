var should = require("should");
var sinon = require("sinon");
var MultiWatching = require("../lib/MultiWatching");

var createWatching = function() {
	return {
		invalidate: sinon.spy(),
		close: sinon.spy()
	};
};

describe("MultiWatching", function() {
	var watchings, myMultiWatching;

	beforeEach(function() {
		watchings = [createWatching(), createWatching()];
		myMultiWatching = new MultiWatching(watchings);
	});

	describe('invalidate', function() {
		beforeEach(function() {
			myMultiWatching.invalidate();
		});

		it('invalidates each watching', function() {
			watchings[0].invalidate.callCount.should.be.exactly(1);
			watchings[1].invalidate.callCount.should.be.exactly(1);
		});
	});

	describe('close', function() {
		var callback;
		var callClosedFinishedCallback = function(watching) {
			watching.close.getCall(0).args[0]();
		};

		beforeEach(function() {
			callback = sinon.spy();
			myMultiWatching.close(callback);
		});

		it('closes each watching', function() {
			watchings[0].close.callCount.should.be.exactly(1);
			watchings[1].close.callCount.should.be.exactly(1);
		});

		it('calls callback after each watching has closed', function() {
			callClosedFinishedCallback(watchings[0]);
			callClosedFinishedCallback(watchings[1]);
			callback.callCount.should.be.exactly(1);
		});
	});
});
