var logLevel = "info";
var isNone = (window.localStorage.isNone === "true") || false; //webpack config devServer clientLogLevel is set to none??
function dummy() {}

function shouldLog(level) {
	if(isNone) {
		return false; //shouldn't log
	}
	var shouldLog = (logLevel === "info" && level === "info") ||
		(["info", "warning"].indexOf(logLevel) >= 0 && level === "warning") ||
		(["info", "warning", "error"].indexOf(logLevel) >= 0 && level === "error");
	return shouldLog;
}

function logGroup(logFn) {
	return function(level, msg) {
		if(shouldLog(level)) {
			logFn(msg);
		}
	};
}

module.exports = function(level, msg) {
	if(shouldLog(level)) {
		if(level === "info") {
			console.log(msg);
		} else if(level === "warning") {
			console.warn(msg);
		} else if(level === "error") {
			console.error(msg);
		}
	}
};

var group = console.group || dummy;
var groupCollapsed = console.groupCollapsed || dummy;
var groupEnd = console.groupEnd || dummy;

module.exports.group = logGroup(group);

module.exports.groupCollapsed = logGroup(groupCollapsed);

module.exports.groupEnd = logGroup(groupEnd);

module.exports.setLogLevel = function(level) {
	//after main module loads
	logLevel = level;
	if(level === "none") {
		window.localStorage.isNone = true;
	} else {
		window.localStorage.isNone = false;
	}
};
