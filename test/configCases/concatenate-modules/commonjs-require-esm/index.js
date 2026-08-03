import * as consumer from "./consumer";
import { bump, counter } from "./shared-esm.js";

it("should give require(esm) the module namespace, with __esModule", () => {
	expect(consumer.ns.foo).toBe("foo-value");
	expect(consumer.ns.default).toBe("default-value");
	expect(consumer.ns.__esModule).toBe(true);
	expect(consumer.nsFoo).toBe("foo-value");
});

it("should unwrap a \"module.exports\" named export for require(esm)", () => {
	expect(typeof consumer.unwrapped).toBe("function");
	expect(consumer.unwrapped()).toBe(42);
	expect(consumer.unwrapped.named).toBe("named-prop");
	// `.named` is read off the unwrapped value, not off the namespace
	expect(consumer.unwrappedNamed).toBe("named-prop");
});

it("should share one instance between an import and a require(esm)", () => {
	expect(counter).toBe(0);
	expect(consumer.bumpFromCjs()).toBe(1);
	expect(bump()).toBe(2);
	expect(consumer.sharedNs.counter).toBe(2);
});

it("should evaluate an ESM chain reached only through require() innermost first", () => {
	// chain-a/b/c are reached only through require(), so all three evaluate
	// through their wrappers
	expect(global.__chainOrder).toEqual(["chain-c", "chain-b", "chain-a"]);
	expect(consumer.chain.label).toBe("a<-b<-c:1");
	expect(consumer.chain.__esModule).toBe(true);
});

it("should keep live bindings working across that chain", () => {
	expect(consumer.chain.deepenFromA()).toBe(2);
	expect(consumer.chain.deepenFromA()).toBe(3);
	// the snapshot taken in chain-b at evaluation time stays at the old value
	expect(consumer.chain.label).toBe("a<-b<-c:1");
});

it("should concatenate the requiring module together with its require(esm) targets", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	const inner = concatModules[0].modules.map((m) => m.name).sort();
	expect(inner).toEqual([
		"./chain-a.js",
		"./chain-b.js",
		"./chain-c.js",
		"./consumer.js",
		"./index.js",
		"./plain-esm.js",
		"./shared-esm.js",
		"./value-esm.js"
	]);
	delete global.__chainOrder;
});
