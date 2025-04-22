module.exports = {
	findBundle(i, options) {
		return i === 0 ? "./web-0.js" : "./webworker-1.js";
	}
};
