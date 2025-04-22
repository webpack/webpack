module.exports = function supportsErrorCause() {
	return (
		typeof new Error("test", { cause: new Error("cause") }).cause !==
		"undefined"
	);
};
