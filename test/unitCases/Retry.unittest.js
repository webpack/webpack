"use strict";

const {
	CONFIGURATION_EXIT_CODE,
	backoffFor,
	main,
	readAttempts,
	readDelay,
	retry,
	runAsScript,
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

		// A corpus whose lockfile was never regenerated fails the same way every
		// time, so three attempts buy nothing and cost the reader the report
		// twice over — in a CI log, scrolled off the top of it.
		it("does not retry a failure the tree itself carries", async () => {
			let runs = 0;
			const code = await retry("cmd", [], {
				delay: 0,
				run: () => {
					runs++;
					return Promise.resolve(CONFIGURATION_EXIT_CODE);
				}
			});
			expect(code).toBe(CONFIGURATION_EXIT_CODE);
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

	describe("main", () => {
		it("runs what the arguments name and returns its exit code", async () => {
			expect(await main([process.execPath, "-e", ""], {})).toBe(0);
			expect(
				await main([process.execPath, "-e", "process.exitCode = 5"], {
					RETRY_ATTEMPTS: "1"
				})
			).toBe(5);
		});

		it("reads the attempts and delay from the environment", async () => {
			const code = await main([process.execPath, "-e", "process.exitCode = 2"], {
				RETRY_ATTEMPTS: "2",
				RETRY_DELAY: "0"
			});
			expect(code).toBe(2);
		});

		it("refuses an invalid setting", () => {
			expect(() => main(["true"], { RETRY_ATTEMPTS: "abc" })).toThrow(
				"RETRY_ATTEMPTS"
			);
			expect(() => main(["true"], { RETRY_DELAY: "-1" })).toThrow("RETRY_DELAY");
		});

		it("names its usage when given nothing to run", () => {
			expect(() => main([], {})).toThrow("usage:");
		});
	});

	describe("runAsScript", () => {
		/**
		 * Runs it with this process's exit code put back afterwards, so a case
		 * asserting a failure cannot decide what the test run itself exits with.
		 * @param {string[]} argv the command and its arguments
		 * @param {NodeJS.ProcessEnv} env the settings to read
		 * @returns {Promise<number | undefined>} the code it set
		 */
		const run = async (argv, env) => {
			const before = process.exitCode;
			try {
				return await runAsScript(argv, env);
			} finally {
				process.exitCode = before;
			}
		};

		it("sets the exit code of what it ran", async () => {
			expect(await run([process.execPath, "-e", ""], {})).toBe(0);
			expect(
				await run([process.execPath, "-e", "process.exitCode = 3"], {
					RETRY_ATTEMPTS: "1"
				})
			).toBe(3);
		});

		it("reports a refused setting as exit code 1", async () => {
			const errors = jest.spyOn(console, "error").mockImplementation(() => {});
			try {
				expect(await run(["true"], { RETRY_ATTEMPTS: "abc" })).toBe(1);
				expect(errors).toHaveBeenCalledWith(
					expect.stringContaining("RETRY_ATTEMPTS")
				);
			} finally {
				errors.mockRestore();
			}
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
