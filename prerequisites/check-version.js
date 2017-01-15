var semver = require("semver");
var requiredVersion = require("../package.json").engines.node;

function requiredToList(requiredVersion) {
	return requiredVersion.split("||").filter(Boolean).map(function(version) {
		return new semver.Range(version).set[0];
	}).map(function(set) {
		if(!set) {
			return null;
		}

		if(set.length === 1) {
			return "\t- At least node version " + set[0];
		}

		return "\t- Between node version " + set[0] + " and " + set[1];
	}).join("\n");
}

if(!semver.satisfies(process.version, requiredVersion)) {
	console.error(
		"\033[0;31mYour node.js version (" + process.version + ") is not supported.\n" +
		"This may lead to unexpected behaviour or failures!\n\n" +
		"Please see below a list of supported node version:\n" +
		requiredToList(requiredVersion) + "\033[0m"
	);
}

