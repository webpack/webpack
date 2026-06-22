module.exports = function (source) {
	return Promise.resolve().then(() => {
		throw new Error(source);
	});
};
