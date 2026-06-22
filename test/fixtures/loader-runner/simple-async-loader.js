module.exports = function (source) {
	var callback = this.async();
	setTimeout(function () {
		callback(null, source + "-async-simple");
	}, 50);
};
