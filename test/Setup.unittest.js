"use strict";

const { isInteractive } = require("../setup/setup");

describe("Setup", () => {
	const stdin = process.stdin.isTTY;
	const stdout = process.stdout.isTTY;
	const { CI, WEBPACK_SETUP } = process.env;

	/**
	 * @param {boolean} tty whether both streams are a terminal
	 * @param {string=} ci value for `CI`, left unset when omitted
	 * @param {string=} forced value for `WEBPACK_SETUP`, left unset when omitted
	 * @returns {boolean} which path setup would take
	 */
	const select = (tty, ci, forced) => {
		process.stdin.isTTY = tty;
		process.stdout.isTTY = tty;
		if (ci === undefined) delete process.env.CI;
		else process.env.CI = ci;
		if (forced === undefined) delete process.env.WEBPACK_SETUP;
		else process.env.WEBPACK_SETUP = forced;
		return isInteractive();
	};

	afterEach(() => {
		process.stdin.isTTY = stdin;
		process.stdout.isTTY = stdout;
		if (CI === undefined) delete process.env.CI;
		else process.env.CI = CI;
		if (WEBPACK_SETUP === undefined) delete process.env.WEBPACK_SETUP;
		else process.env.WEBPACK_SETUP = WEBPACK_SETUP;
	});

	it("should take the contributor path at a terminal", () => {
		expect(select(true)).toBe(true);
	});

	it("should take the automated path off a terminal", () => {
		expect(select(false)).toBe(false);
	});

	it("should take the automated path for any defined CI", () => {
		expect(select(true, "true")).toBe(false);
		expect(select(true, "false")).toBe(false);
		expect(select(true, "0")).toBe(false);
	});

	it("should treat an empty CI as defined", () => {
		expect(select(true, "")).toBe(false);
	});

	it("should let WEBPACK_SETUP force either path", () => {
		expect(select(false, "true", "interactive")).toBe(true);
		expect(select(true, undefined, "automated")).toBe(false);
	});

	it("should ignore an unknown WEBPACK_SETUP value", () => {
		expect(select(true, undefined, "yes")).toBe(true);
		expect(select(false, undefined, "yes")).toBe(false);
	});

	it("should require both streams to be a terminal", () => {
		process.stdout.isTTY = true;
		process.stdin.isTTY = false;
		delete process.env.CI;
		delete process.env.WEBPACK_SETUP;
		expect(isInteractive()).toBe(false);
		process.stdin.isTTY = true;
		process.stdout.isTTY = false;
		expect(isInteractive()).toBe(false);
	});
});
