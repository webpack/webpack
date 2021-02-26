module.exports = function (source) {
	expect(source).toMatch(/^\}\)\]/);
	this.cacheable(false);
	return new Promise(resolve => {
		setTimeout(() => {
			resolve("module.exports = require('./foo/' + WATCH_STEP);");
		}, 500);
	});
};
