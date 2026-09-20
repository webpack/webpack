"use strict";

const {
	backoffFor,
	readAttempts,
	readDelay,
	retry,
	runOnce
} = require("../../tooling/retry");

describe("retry", () => {
	describe("readAttempts", () => {
		it("defaults when unset or empty", () => {
			expect(readAttempts(undefined)).toBe(3);
			expect(readAttempts("")).toBe(3);
		});

		it("reads a positive integer", () => {
			expect(readAttempts("1")).toBe(1);
			expect(readAttempts("10")).toBe(10);
		});

		// A value reaching the loop as NaN retried until the job timed out, so
		// each of these has to be refused rather than defaulted.
		it.each([["abc"], ["0"], ["-1"], ["1.5"], ["Infinity"]])(
			"refuses %p",
			(value) => {
				expect(() => readAttempts(value)).toThrow("RETRY_ATTEMPTS");
			}
		);
	});

	describe("readDelay", () => {
		it("defaults when unset or empty", () => {
			expect(readDelay(undefined)).toBe(5000);
			expect(readDelay("")).toBe(5000);
		});

		it("allows zero and fractional milliseconds", () => {
			expect(readDelay("0")).toBe(0);
			expect(readDelay("2.5")).toBe(2.5);
		});

		it.each([["abc"], ["-5"], ["Infinity"]])("refuses %p", (value) => {
			expect(() => readDelay(value)).toThrow("RETRY_DELAY");
		});
	});

	describe("backoffFor", () => {
		it("doubles the wait for each attempt", () => {
			expect(backoffFor(100, 1)).toBe(100);
			expect(backoffFor(100, 2)).toBe(200);
			expect(backoffFor(100, 4)).toBe(800);
		});

		// Node clamps a timer above 2**31-1 ms to 1 ms, so an unclamped doubling
		// would retry at once where it meant to wait longest.
		it("stays inside the range a timer accepts", () => {
			expect(backoffFor(2147483648, 1)).toBe(2147483647);
			expect(backoffFor(3600000, 13)).toBe(2147483647);
		});
	});

	describe("retry", () => {
		it("runs once when the command succeeds", async () => {
			/** @type {string[][]} */
			const calls = [];
			const code = await retry("cmd", ["a"], {
				delay: 0,
				run: (command, args) => {
					calls.push([command].concat(args));
					return Promise.resolve(0);
				}
			});
			expect(code).toBe(0);
			expect(calls).toEqual([["cmd", "a"]]);
		});

		it("stops at the first success after a failure", async () => {
			let runs = 0;
			const code = await retry("cmd", [], {
				delay: 0,
				run: () => Promise.resolve(++runs === 1 ? 1 : 0)
			});
			expect(code).toBe(0);
			expect(runs).toBe(2);
		});

		it("gives up after the configured attempts and keeps the exit code", async () => {
			let runs = 0;
			const code = await retry("cmd", [], {
				attempts: 4,
				delay: 0,
				run: () => {
					runs++;
					return Promise.resolve(7);
				}
			});
			expect(code).toBe(7);
			expect(runs).toBe(4);
		});

		it("does not retry when one attempt is allowed", async () => {
			let runs = 0;
			const code = await retry("cmd", [], {
				attempts: 1,
				delay: 0,
				run: () => {
					runs++;
					return Promise.resolve(3);
				}
			});
			expect(code).toBe(3);
			expect(runs).toBe(1);
		});

		it("lets a spawn error reject rather than retrying it", async () => {
			await expect(
				retry("cmd", [], {
					delay: 0,
					run: () => Promise.reject(new Error("spawn failed"))
				})
			).rejects.toThrow("spawn failed");
		});
	});

	describe("runOnce", () => {
		it("resolves with the exit code of the process", async () => {
			expect(await runOnce(process.execPath, ["-e", "process.exitCode = 0"])).toBe(0);
			expect(await runOnce(process.execPath, ["-e", "process.exitCode = 4"])).toBe(4);
		});

		// Windows runs these through a shell, which reports an unknown command as
		// an exit code rather than as a spawn error, so only posix takes this one.
		const itSpawnErrors = process.platform === "win32" ? it.skip : it;
		itSpawnErrors("rejects when the command cannot be spawned", async () => {
			const reason = await runOnce("webpack-no-such-command", []).then(
				() => "resolved",
				(error) => error.code
			);
			expect(reason).toBe("ENOENT");
		});
	});
});
