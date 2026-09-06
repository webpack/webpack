"use strict";

const { EventEmitter } = require("events");
const { effects, isInteractive, setup } = require("../setup/setup");

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
	const real = { ...effects };
	/** @type {jest.Mock} */
	let symlinkSync;

	/**
	 * @param {boolean} linked whether `node_modules/webpack` already exists
	 * @returns {void}
	 */
	const link = (linked) => {
		effects.existsSync = () => true;
		effects.lstatSync = () => {
			if (!linked) throw new Error("ENOENT");
			return /** @type {EXPECTED_ANY} */ ({ isSymbolicLink: () => true });
		};
	};

	/**
	 * @returns {string[][]} the commands run, each as command plus arguments
	 */
	const ran = () =>
		/** @type {jest.Mock} */
		(effects.spawn).mock.calls.map(([command, args]) => [command, ...args]);

	beforeEach(() => {
		jest.spyOn(effects, "spawn").mockImplementation();
		symlinkSync = jest.fn();
		effects.symlinkSync = symlinkSync;
	});

	afterEach(() => {
		Object.assign(effects, real);
		process.stdin.isTTY = stdin;
		process.stdout.isTTY = stdout;
		if (CI === undefined) delete process.env.CI;
		else process.env.CI = CI;
		if (WEBPACK_SETUP === undefined) delete process.env.WEBPACK_SETUP;
		else process.env.WEBPACK_SETUP = WEBPACK_SETUP;
	});

	it("should verify the lockfile and link directly when automated", async () => {
		process.env.WEBPACK_SETUP = "automated";
		link(false);
		/** @type {jest.Mock} */ (effects.spawn).mockImplementation(
			(command, args) => (args[0] === "-v" ? child(0, "1.22.22") : child(0))
		);
		const code = await setup();
		expect(code).toBe(0);
		expect(ran()).toEqual([
			["yarn", "-v"],
			["yarn", "install", "--frozen-lockfile"]
		]);
		expect(symlinkSync).toHaveBeenCalledTimes(1);
	});

	it("should not install a global yarn when automated", async () => {
		process.env.WEBPACK_SETUP = "automated";
		link(false);
		/** @type {jest.Mock} */ (effects.spawn).mockReturnValue(child(1));
		const code = await setup();
		expect(ran()).toEqual([["yarn", "-v"]]);
		expect(symlinkSync).not.toHaveBeenCalled();
		expect(code).toBe(1);
	});

	it("should keep an existing link when automated", async () => {
		process.env.WEBPACK_SETUP = "automated";
		link(true);
		/** @type {jest.Mock} */ (effects.spawn).mockImplementation(
			(command, args) => (args[0] === "-v" ? child(0, "1.22.22") : child(0))
		);
		const code = await setup();
		expect(code).toBe(0);
		expect(symlinkSync).not.toHaveBeenCalled();
	});

	it("should link through the registry when a contributor", async () => {
		process.env.WEBPACK_SETUP = "interactive";
		let linked = false;
		effects.existsSync = () => true;
		effects.lstatSync = () => {
			if (!linked) throw new Error("ENOENT");
			return /** @type {EXPECTED_ANY} */ ({ isSymbolicLink: () => true });
		};
		/** @type {jest.Mock} */ (effects.spawn).mockImplementation(
			(command, args) => {
				if (args[0] === "link" && args[1] === "webpack") linked = true;
				return args[0] === "-v" ? child(0, "1.22.22") : child(0);
			}
		);
		const code = await setup();
		expect(code).toBe(0);
		expect(ran()).toEqual([
			["yarn", "-v"],
			["yarn", "install"],
			["yarn", "link"],
			["yarn", "link", "webpack"]
		]);
	});

	it("should install yarn for a contributor without it", async () => {
		process.env.WEBPACK_SETUP = "interactive";
		let linked = false;
		effects.existsSync = () => true;
		effects.lstatSync = () => {
			if (!linked) throw new Error("ENOENT");
			return /** @type {EXPECTED_ANY} */ ({ isSymbolicLink: () => true });
		};
		/** @type {jest.Mock} */ (effects.spawn).mockImplementation(
			(command, args) => {
				if (args[0] === "link" && args[1] === "webpack") linked = true;
				if (args[0] === "-v") return child(127);
				return child(0);
			}
		);
		const code = await setup();
		expect(code).toBe(0);
		expect(ran()[0]).toEqual(["yarn", "-v"]);
		expect(ran()[1]).toEqual(["npm", "install", "-g", "yarn"]);
	});

	it("should do nothing for a contributor already linked", async () => {
		process.env.WEBPACK_SETUP = "interactive";
		link(true);
		const code = await setup();
		expect(code).toBe(0);
		expect(ran()).toEqual([]);
	});
});
