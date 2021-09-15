module.exports = function() {
	this.cacheable(false);
	return new Promise(resolve => {
		setTimeout(() => {
			resolve("module.exports = require('./foo/' + WATCH_STEP);");
		}, 500);
	});
}
