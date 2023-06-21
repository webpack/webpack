module.exports = function b() {
	/* eslint-disable n/no-missing-require */
	require("./nonexistentfile");
	return "This is a missing file";
};
