import order from "./order";
import "./first";
import "./pure-bare";
import pureUsed, { value } from "./pure-used";
import { value as impureValue } from "./impure";
import { fromConsumer } from "./pure-esm-consumer";
import config from "./reads-config";
import flaggedConfig from "./flagged/reads-config";
import { barrelConfig } from "./barrel";
import { reexportedConfig } from "./set-config";
import "./last";

require("./pure-required");

it("should evaluate impure neighbours in order around dropped pure modules", () => {
	expect(order).toEqual(["first", "impure", "last"]);
});

it("should leave dropped pure modules out of the bundle", () => {
	const source = require("fs").readFileSync(__filename, "utf8");
	expect(source).not.toContain("pure-bare body" + " marker");
	expect(source).not.toContain("pure-required body" + " marker");
});

it("should read a pure module kept for its exports", () => {
	expect(value).toBe(1);
	expect(pureUsed.value).toBe(1);
	// `module.exports` replaced the object `exports` still points at
	expect(pureUsed.read().original).toBe(true);
	expect(impureValue).toBe(2);
	expect(fromConsumer).toBe(3);
});

it("should evaluate a used pure module at its import, before later imports run", () => {
	expect(config).toBe("unset");
	expect(flaggedConfig).toBe("unset");
	expect(barrelConfig).toBe("unset");
	expect(reexportedConfig).toBe("unset");
	delete global.__commonjsExportsConfig;
});
