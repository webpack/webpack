// if this module were parsed, webpack would try to resolve the bare request at
// build time and fail; noParse leaves the require untouched.
module.exports = function () {
	return require("this-module-does-not-exist");
};
