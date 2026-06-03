"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const MOCK_WEBPACK = path.resolve(
	__dirname,
	"fixtures/webpack-cli/mock-webpack.js"
);

// Runs webpack-cli in-process against a mock webpack module injected via the
// documented WEBPACK_PACKAGE env var (webpack-cli loads webpack through a native
// import jest.mock cannot intercept). process.exit/console.error are spied so a
// validation failure surfaces as an exit code plus the captured messages.
const run = async (args) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wp-cli-"));
	const capture = path.join(dir, "config.json");
	process.env.WEBPACK_PACKAGE = MOCK_WEBPACK;
	process.env.WEBPACK_CLI_TEST_CAPTURE = capture;
	jest.resetModules();

	const WebpackCLI = require("webpack-cli").default;

	const exitSpy = jest.spyOn(process, "exit").mockImplementation((code) => {
		throw new Error(`__exit__ ${code}`);
	});
	const errors = [];
	const errorSpy = jest
		.spyOn(console, "error")
		.mockImplementation((message) => errors.push(`${message}`));
	let exitCode = 0;
	try {
		await new WebpackCLI().run(["node", "webpack", "build", ...args]);
	} catch (error) {
		const match = /__exit__ (\d+)/.exec(error.message);
		if (!match) throw error;
		exitCode = Number(match[1]);
	} finally {
		exitSpy.mockRestore();
		errorSpy.mockRestore();
		delete process.env.WEBPACK_PACKAGE;
		delete process.env.WEBPACK_CLI_TEST_CAPTURE;
	}
	const config = fs.existsSync(capture)
		? JSON.parse(fs.readFileSync(capture, "utf8"))
		: undefined;
	fs.rmSync(dir, { recursive: true, force: true });
	return { config, exitCode, errors: errors.join("\n") };
};

describe("WebpackCLI integration", () => {
	it("parses every cli argument type into the webpack config", async () => {
		const { config } = await run([
			"--flag",
			"--count",
			"42",
			"--name",
			"hello",
			"--output",
			"rel/p",
			"--pattern",
			"/ab?c/i",
			"--level",
			"warn",
			"--list",
			"a",
			"--list",
			"b",
			"--mode",
			"production"
		]);
		expect(config.flag).toBe(true); // boolean
		expect(config.count).toBe(42); // number
		expect(config.name).toBe("hello"); // string
		expect(config.output).toBe(path.resolve("rel/p")); // path
		expect(config.pattern).toEqual({ source: "ab?c", flags: "i" }); // RegExp
		expect(config.level).toBe("warn"); // enum
		expect(config.list).toEqual(["a", "b"]); // array (multiple)
		expect(config.mode).toBe("production"); // const
	});

	it("resets an array via the reset flag", async () => {
		const { config } = await run(["--list-reset"]);
		expect(config.list).toEqual([]);
	});

	it("collects multiple values for a multiple flag", async () => {
		const { config } = await run(["--list", "a", "--list", "b", "--list", "c"]);
		expect(config.list).toEqual(["a", "b", "c"]);
	});

	it("negates a boolean flag via --no-flag", async () => {
		const { config } = await run(["--no-flag"]);
		expect(config.flag).toBe(false);
	});

	it("accepts the other allowed enum value", async () => {
		const { config } = await run(["--level", "info"]);
		expect(config.level).toBe("info");
	});

	it("treats a boolean `const` as a boolean flag", async () => {
		const { config } = await run(["--bool-const"]);
		expect(config.boolConst).toBe(true);
	});

	it("accepts a numeric `const` and rejects other numbers", async () => {
		const ok = await run(["--num-const", "5"]);
		expect(ok.config.numConst).toBe(5);

		const bad = await run(["--num-const", "6"]);
		expect(bad.exitCode).toBe(2);
		expect(bad.errors).toMatch(
			/Invalid value '6' for the '--num-const' option/
		);
		expect(bad.errors).toMatch(/Expected: '5'/);
	});

	it("rejects an enum value outside the allowed set", async () => {
		const { exitCode, errors } = await run(["--level", "nope"]);
		expect(exitCode).toBe(2);
		expect(errors).toMatch(/Invalid value 'nope' for the '--level' option/);
		expect(errors).toMatch(/Expected: 'info \| warn'/);
	});

	it("rejects a value other than the `const`", async () => {
		const { exitCode, errors } = await run(["--mode", "development"]);
		expect(exitCode).toBe(2);
		expect(errors).toMatch(
			/Invalid value 'development' for the '--mode' option/
		);
		expect(errors).toMatch(/Expected: 'production'/);
	});
});
