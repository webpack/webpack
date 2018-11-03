module.exports = function b() {
	/* eslint-disable node/no-missing-require */
	require("./nonexistentfile");
	return "This is a missing file";
};
