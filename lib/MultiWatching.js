/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var async = require("async");

function MultiWatching(watchings) {
	this.watchings = watchings;
}

MultiWatching.prototype.invalidate = function() {
	this.watchings.forEach(function(watching) {
		watching.invalidate();
	});
};

MultiWatching.prototype.close = function(callback) {
	async.forEach(this.watchings, function(watching, finishedCallback) {
		watching.close(finishedCallback);
	}, callback);
};

module.exports = MultiWatching;
