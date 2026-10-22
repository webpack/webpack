import * as consumer from "./consumer";
import { viaEsm } from "./esm-mid.js";
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

it("should re-export require(esm) as the module namespace, with __esModule", () => {
	expect(consumer.nsDirect.foo).toBe("foo-value");
	expect(consumer.nsDirect.__esModule).toBe(true);
	expect("__esModule" in consumer.ns).toBe(true);
	expect("__esModule" in consumer.nsDirect).toBe(true);
});

it("should re-export an unwrapped require(esm) without __esModule", () => {
	expect(consumer.unwrappedDirect()).toBe(42);
	expect("__esModule" in consumer.unwrapped).toBe(false);
	expect("__esModule" in consumer.unwrappedDirect).toBe(false);
});

it("should follow an ESM re-export of a require(esm) re-export", () => {
	expect(viaEsm.foo).toBe("foo-value");
	expect(viaEsm.default).toBe("default-value");
});

it("should follow a require() re-export of a CommonJS re-export", () => {
	expect(consumer.mid.ns.foo).toBe("foo-value");
	expect(consumer.mid.ns.__esModule).toBe(true);
});

it("should concatenate the requiring module together with its require(esm) targets", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	const inner = concatModules[0].modules.map((m) => m.name).sort();
	expect(inner).toEqual([
		"./chain-a.js",
		"./chain-b.js",
		"./chain-c.js",
		"./cjs-mid.js",
		"./consumer.js",
		"./esm-mid.js",
		"./index.js",
		"./plain-esm.js",
		"./shared-esm.js",
		"./value-esm.js"
	]);
	delete global.__chainOrder;
});
