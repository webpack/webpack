"use strict";

const { LogType, Logger } = require("../../lib/logging/Logger");

/**
 * @returns {{ logger: Logger, entries: [string, EXPECTED_ANY[]][] }} a logger recording what it logged
 */
const createLogger = () => {
	/** @type {[string, EXPECTED_ANY[]][]} */
	const entries = [];
	const logger = new Logger(
		(type, args) => entries.push([type, args || []]),
		(name) => createLogger().logger
	);
	return { logger, entries };
};

describe("Logger", () => {
	it("should log the elapsed time of a started label", () => {
		const { logger, entries } = createLogger();
		logger.time("build");
		logger.timeLog("build");
		logger.timeEnd("build");
		expect(entries).toHaveLength(2);
		for (const [type, args] of entries) {
			expect(type).toBe(LogType.time);
			expect(args[0]).toBe("build");
			expect(typeof args[1]).toBe("number");
			expect(typeof args[2]).toBe("number");
		}
	});

	it("should throw for a label that was never started", () => {
		const { logger } = createLogger();
		expect(() => logger.timeLog("missing")).toThrow(
			"No such label 'missing' for Logger.timeLog()"
		);
		expect(() => logger.timeEnd("missing")).toThrow(
			"No such label 'missing' for Logger.timeEnd()"
		);
		expect(() => logger.timeAggregate("missing")).toThrow(
			"No such label 'missing' for Logger.timeAggregate()"
		);
	});

	it("should throw once a label has been ended", () => {
		const { logger } = createLogger();
		logger.time("build");
		logger.timeEnd("build");
		expect(() => logger.timeEnd("build")).toThrow(
			"No such label 'build' for Logger.timeEnd()"
		);
	});

	it("should sum the aggregated times of a label", () => {
		const { logger, entries } = createLogger();
		logger.time("hash");
		logger.timeAggregate("hash");
		logger.time("hash");
		logger.timeAggregate("hash");
		expect(entries).toHaveLength(0);
		logger.timeAggregateEnd("hash");
		expect(entries).toHaveLength(1);
		expect(entries[0][0]).toBe(LogType.time);
		expect(entries[0][1][0]).toBe("hash");
	});

	it("should ignore ending an aggregate that was never collected", () => {
		const { logger, entries } = createLogger();
		logger.timeAggregateEnd("never");
		logger.time("other");
		logger.timeAggregate("other");
		logger.timeAggregateEnd("missing");
		expect(entries).toHaveLength(0);
	});
});
