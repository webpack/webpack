exports.pitch = function (remainingRequest, previousRequest, data) {
	return [remainingRequest, previousRequest].join(":");
};
