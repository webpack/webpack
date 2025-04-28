module.exports = {
	findBundle(i, options) {
		return [`./${options.name}-main.js`];
	}
};
