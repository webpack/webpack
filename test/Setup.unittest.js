"use strict";

// Nothing here is transformed (`transformIgnorePatterns`), so `jest.mock` is
// not hoisted: it has to be registered before the requires below.
jest.mock("child_process", () => ({ spawn: jest.fn() }));

const { spawn } = require("child_process");
const { EventEmitter } = require("events");
const fs = require("fs");
const { isInteractive, setup } = require("../setup/setup");

/**
 * @param {number} exitCode code the process exits with
 * @param {string=} stdout what it writes, for the version check
 * @returns {EventEmitter} a stand-in for the child process
 */
const child = (exitCode, stdout) => {
	const cp = /** @type {EventEmitter & { stdout: EventEmitter }} */ (
		new EventEmitter()
	);
	cp.stdout = new EventEmitter();
	process.nextTick(() => {
		if (stdout !== undefined) cp.stdout.emit("data", Buffer.from(stdout));
		cp.emit("exit", exitCode);
	});
	return cp;
};

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

describe("Setup paths", () => {
	const stdin = process.stdin.isTTY;
	const stdout = process.stdout.isTTY;
	const { CI, WEBPACK_SETUP } = process.env;
	/** @type {jest.SpyInstance} */
	let existsSync;
	/** @type {jest.SpyInstance} */
	let lstatSync;
	/** @type {jest.SpyInstance} */
	let symlinkSync;

	/**
	 * @param {boolean} linked whether `node_modules/webpack` already exists
	 * @returns {void}
	 */
	const link = (linked) => {
		existsSync.mockReturnValue(true);
		lstatSync.mockImplementation(() => {
			if (!linked) throw new Error("ENOENT");
			return { isSymbolicLink: () => true };
		});
	};

	/**
	 * @returns {string[][]} the commands run, each as command plus arguments
	 */
	const ran = () =>
		/** @type {jest.Mock} */
		(spawn).mock.calls.map(([command, args]) => [command, ...args]);

	beforeEach(() => {
		/** @type {jest.Mock} */ (spawn).mockReset();
		existsSync = jest.spyOn(fs, "existsSync");
		lstatSync = jest.spyOn(fs, "lstatSync");
		symlinkSync = jest.spyOn(fs, "symlinkSync").mockReturnValue(undefined);
		process.exitCode = 0;
	});

	afterEach(() => {
		jest.restoreAllMocks();
		process.stdin.isTTY = stdin;
		process.stdout.isTTY = stdout;
		if (CI === undefined) delete process.env.CI;
		else process.env.CI = CI;
		if (WEBPACK_SETUP === undefined) delete process.env.WEBPACK_SETUP;
		else process.env.WEBPACK_SETUP = WEBPACK_SETUP;
		process.exitCode = 0;
	});

	it("should verify the lockfile and link directly when automated", async () => {
		process.env.WEBPACK_SETUP = "automated";
		link(false);
		/** @type {jest.Mock} */ (spawn).mockImplementation((command, args) =>
			args[0] === "-v" ? child(0, "1.22.22") : child(0)
		);
		await setup();
		expect(ran()).toEqual([
			["yarn", "-v"],
			["yarn", "install", "--frozen-lockfile"]
		]);
		expect(symlinkSync).toHaveBeenCalledTimes(1);
		expect(process.exitCode).toBe(0);
	});

	it("should not install a global yarn when automated", async () => {
		process.env.WEBPACK_SETUP = "automated";
		link(false);
		/** @type {jest.Mock} */ (spawn).mockReturnValue(child(1));
		await setup();
		expect(ran()).toEqual([["yarn", "-v"]]);
		expect(symlinkSync).not.toHaveBeenCalled();
		expect(process.exitCode).toBe(1);
	});

	it("should keep an existing link when automated", async () => {
		process.env.WEBPACK_SETUP = "automated";
		link(true);
		/** @type {jest.Mock} */ (spawn).mockImplementation((command, args) =>
			args[0] === "-v" ? child(0, "1.22.22") : child(0)
		);
		await setup();
		expect(symlinkSync).not.toHaveBeenCalled();
		expect(process.exitCode).toBe(0);
	});

	it("should link through the registry when a contributor", async () => {
		process.env.WEBPACK_SETUP = "interactive";
		let linked = false;
		existsSync.mockReturnValue(true);
		lstatSync.mockImplementation(() => {
			if (!linked) throw new Error("ENOENT");
			return { isSymbolicLink: () => true };
		});
		/** @type {jest.Mock} */ (spawn).mockImplementation((command, args) => {
			if (args[0] === "link" && args[1] === "webpack") linked = true;
			return args[0] === "-v" ? child(0, "1.22.22") : child(0);
		});
		await setup();
		expect(ran()).toEqual([
			["yarn", "-v"],
			["yarn", "install"],
			["yarn", "link"],
			["yarn", "link", "webpack"]
		]);
		expect(process.exitCode).toBe(0);
	});

	it("should install yarn for a contributor without it", async () => {
		process.env.WEBPACK_SETUP = "interactive";
		let linked = false;
		existsSync.mockReturnValue(true);
		lstatSync.mockImplementation(() => {
			if (!linked) throw new Error("ENOENT");
			return { isSymbolicLink: () => true };
		});
		/** @type {jest.Mock} */ (spawn).mockImplementation((command, args) => {
			if (args[0] === "link" && args[1] === "webpack") linked = true;
			if (args[0] === "-v") return child(127);
			return child(0);
		});
		await setup();
		expect(ran()[0]).toEqual(["yarn", "-v"]);
		expect(ran()[1]).toEqual(["npm", "install", "-g", "yarn"]);
		expect(process.exitCode).toBe(0);
	});

	it("should do nothing for a contributor already linked", async () => {
		process.env.WEBPACK_SETUP = "interactive";
		link(true);
		await setup();
		expect(ran()).toEqual([]);
		expect(process.exitCode).toBe(0);
	});
});
