let logLevel = "info";

function dummy() {}

function shouldLog(level) {
	return typeof level === "string" && ["info", "warning", "error"].includes(level);
}

function logGroup(logFn) {
	return function (level, msg) {
		if (shouldLog(level)) {
			logFn(msg);
		}
	};
}

module.exports = function (level, msg) {
	if (!shouldLog(level)) return void 0;

	if (level === "info") level = "log";
	else if (level === "warning") level = "warn";

	console[level](msg)
};

/* eslint-disable node/no-unsupported-features/node-builtins */
const group = console.group || dummy,
  groupCollapsed = console.groupCollapsed || dummy,
  groupEnd = console.groupEnd || dummy;
/* eslint-enable node/no-unsupported-features/node-builtins */

module.exports.group = logGroup(group);

module.exports.groupCollapsed = logGroup(groupCollapsed);

module.exports.groupEnd = logGroup(groupEnd);

module.exports.setLogLevel = function (level) {
	logLevel = level;
};

module.exports.formatError = function (err) {
	const {message , stack} = err;

	if (!stack) return message;
	if (stack.includes(message)) {
		return message + "\n" + stack;
	} else {
		return stack;
	}
};
