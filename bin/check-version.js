var semver = require("semver");
var chalk = require("chalk");
var packageJSON = require("../package.json");
var engineVersions = packageJSON.engines.node;
var webpackVersion = packageJSON.version;

function requiredToList(requiredVersion) {
	return new semver.Range(requiredVersion).set.map(function(set) {
		if(!set[0].value) {
			return "\t- No valid version found - please consult http://webpack.js.org";
		}

		if(set.length === 1) {
			return "\t- At least node version " + set[0].value;
		}

		return "\t- Node versions between " + set[0].value + " and " + set[1].value;
	}).join(" - or\n");
}

module.exports = function checkVersion(providedVersion, requiredVersion) {
	if(!providedVersion) {
		providedVersion = process.version;
	}
	if(!requiredVersion) {
		requiredVersion = engineVersions;
	}

	if(!semver.satisfies(providedVersion, requiredVersion)) {
		return chalk.red(
			"Your node.js version (" + providedVersion + ") is not supported by Webpack(" + webpackVersion + ").\n" +
			"This may lead to unexpected behaviour or failures!\n\n" +
			"Please see below a list of supported node version(s) for Webpack " + webpackVersion + ":\n" +
			requiredToList(requiredVersion)
		);
	}
};
