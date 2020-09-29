/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const LogType = Object.freeze({
	error: /** @type {"error"} */ ("error"), // message, c style arguments
	warn: /** @type {"warn"} */ ("warn"), // message, c style arguments
	info: /** @type {"info"} */ ("info"), // message, c style arguments
	log: /** @type {"log"} */ ("log"), // message, c style arguments
	debug: /** @type {"debug"} */ ("debug"), // message, c style arguments

	trace: /** @type {"trace"} */ ("trace"), // no arguments

	group: /** @type {"group"} */ ("group"), // [label]
	groupCollapsed: /** @type {"groupCollapsed"} */ ("groupCollapsed"), // [label]
	groupEnd: /** @type {"groupEnd"} */ ("groupEnd"), // [label]

	profile: /** @type {"profile"} */ ("profile"), // [profileName]
	profileEnd: /** @type {"profileEnd"} */ ("profileEnd"), // [profileName]

	time: /** @type {"time"} */ ("time"), // name, time as [seconds, nanoseconds]

	clear: /** @type {"clear"} */ ("clear"), // no arguments
	status: /** @type {"status"} */ ("status") // message, arguments
});

exports.LogType = LogType;

/** @typedef {typeof LogType[keyof typeof LogType]} LogTypeEnum */

const LOG_SYMBOL = Symbol("webpack logger raw log method");
const TIMERS_SYMBOL = Symbol("webpack logger times");
const TIMERS_AGGREGATES_SYMBOL = Symbol("webpack logger aggregated times");

class WebpackLogger {
	/**
	 * @param {function(LogTypeEnum, any[]=): void} log log function
	 * @param {function(string | function(): string): WebpackLogger} getChildLogger function to create child logger
	 */
	constructor(log, getChildLogger) {
		this[LOG_SYMBOL] = log;
		this.getChildLogger = getChildLogger;
	}

	error(...args) {
		this[LOG_SYMBOL](LogType.error, args);
	}

	warn(...args) {
		this[LOG_SYMBOL](LogType.warn, args);
	}

	info(...args) {
		this[LOG_SYMBOL](LogType.info, args);
	}

	log(...args) {
		this[LOG_SYMBOL](LogType.log, args);
	}

	debug(...args) {
		this[LOG_SYMBOL](LogType.debug, args);
	}

	assert(assertion, ...args) {
		if (!assertion) {
			this[LOG_SYMBOL](LogType.error, args);
		}
	}

	trace() {
		this[LOG_SYMBOL](LogType.trace, ["Trace"]);
	}

	clear() {
		this[LOG_SYMBOL](LogType.clear);
	}

	status(...args) {
		this[LOG_SYMBOL](LogType.status, args);
	}

	group(...args) {
		this[LOG_SYMBOL](LogType.group, args);
	}

	groupCollapsed(...args) {
		this[LOG_SYMBOL](LogType.groupCollapsed, args);
	}

	groupEnd(...args) {
		this[LOG_SYMBOL](LogType.groupEnd, args);
	}

	profile(label) {
		this[LOG_SYMBOL](LogType.profile, [label]);
	}

	profileEnd(label) {
		this[LOG_SYMBOL](LogType.profileEnd, [label]);
	}

	time(label) {
		this[TIMERS_SYMBOL] = this[TIMERS_SYMBOL] || new Map();
		this[TIMERS_SYMBOL].set(label, process.hrtime());
	}

	timeLog(label) {
		const prev = this[TIMERS_SYMBOL] && this[TIMERS_SYMBOL].get(label);
		if (!prev) {
			throw new Error(`No such label '${label}' for WebpackLogger.timeLog()`);
		}
		const time = process.hrtime(prev);
		this[LOG_SYMBOL](LogType.time, [label, ...time]);
	}

	timeEnd(label) {
		const prev = this[TIMERS_SYMBOL] && this[TIMERS_SYMBOL].get(label);
		if (!prev) {
			throw new Error(`No such label '${label}' for WebpackLogger.timeEnd()`);
		}
		const time = process.hrtime(prev);
		this[TIMERS_SYMBOL].delete(label);
		this[LOG_SYMBOL](LogType.time, [label, ...time]);
	}

	timeAggregate(label) {
		const prev = this[TIMERS_SYMBOL] && this[TIMERS_SYMBOL].get(label);
		if (!prev) {
			throw new Error(
				`No such label '${label}' for WebpackLogger.timeAggregate()`
			);
		}
		const time = process.hrtime(prev);
		this[TIMERS_SYMBOL].delete(label);
		this[TIMERS_AGGREGATES_SYMBOL] =
			this[TIMERS_AGGREGATES_SYMBOL] || new Map();
		const current = this[TIMERS_AGGREGATES_SYMBOL].get(label);
		if (current !== undefined) {
			if (time[1] + current[1] > 1e9) {
				time[0] += current[0] + 1;
				time[1] = time[1] - 1e9 + current[1];
			} else {
				time[0] += current[0];
				time[1] += current[1];
			}
		}
		this[TIMERS_AGGREGATES_SYMBOL].set(label, time);
	}

	timeAggregateEnd(label) {
		if (this[TIMERS_AGGREGATES_SYMBOL] === undefined) return;
		const time = this[TIMERS_AGGREGATES_SYMBOL].get(label);
		if (time === undefined) return;
		this[LOG_SYMBOL](LogType.time, [label, ...time]);
	}
}

exports.Logger = WebpackLogger;
