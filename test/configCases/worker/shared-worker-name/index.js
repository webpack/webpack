import { name } from "./name";

it("should preserve a literal SharedWorker name", () => {
	const worker = new SharedWorker(new URL("./worker.js", import.meta.url), "chat");
	expect(worker.options).toEqual(
		expectedWorkerType ? { name: "chat", type: "module" } : "chat"
	);
});

it("should preserve an empty SharedWorker name", () => {
	const worker = new SharedWorker(new URL("./worker.js", import.meta.url), "");
	expect(worker.options).toEqual(
		expectedWorkerType ? { name: "", type: "module" } : ""
	);
});

it("should evaluate a SharedWorker name only once", () => {
	let calls = 0;
	const worker = new SharedWorker(
		new URL("./worker.js", import.meta.url),
		(() => {
			calls++;
			return "dynamic";
		})()
	);
	expect(calls).toBe(1);
	expect(worker.options).toEqual(
		expectedWorkerType ? { name: "dynamic", type: "module" } : "dynamic"
	);
});

it("should preserve an imported SharedWorker name", () => {
	const worker = new SharedWorker(new URL("./worker.js", import.meta.url), name);
	expect(worker.options).toEqual(
		expectedWorkerType ? { name: "imported", type: "module" } : "imported"
	);
});

it("should preserve sequence expressions used as SharedWorker names", () => {
	let calls = 0;
	const worker = new SharedWorker(
		new URL("./worker.js", import.meta.url),
		(calls++, "sequence")
	);
	expect(calls).toBe(1);
	expect(worker.options).toEqual(
		expectedWorkerType ? { name: "sequence", type: "module" } : "sequence"
	);
});

it("should preserve SharedWorker option objects without mutating them", () => {
	let calls = 0;
	const options = Object.freeze({ name: "object", type: "classic" });
	const worker = new SharedWorker(
		new URL("./worker.js", import.meta.url),
		(() => {
			calls++;
			return options;
		})()
	);
	expect(calls).toBe(1);
	expect(options.type).toBe("classic");
	expect(worker.options).toEqual({ name: "object", type: expectedWorkerType });
});

it("should preserve literal SharedWorker options", () => {
	const worker = new SharedWorker(new URL("./worker.js", import.meta.url), {
		name: "literal-object",
		type: "classic"
	});
	expect(worker.options).toEqual({
		name: "literal-object",
		type: expectedWorkerType
	});
});

it("should handle omitted SharedWorker options", () => {
	const worker = new SharedWorker(new URL("./worker.js", import.meta.url));
	expect(worker.options).toEqual(
		expectedWorkerType ? { type: "module" } : undefined
	);
});

it("should handle null and undefined SharedWorker options", () => {
	const nullOptions = new SharedWorker(
		new URL("./worker.js", import.meta.url),
		null
	);
	const undefinedOptions = new SharedWorker(
		new URL("./worker.js", import.meta.url),
		undefined
	);
	expect(nullOptions.options).toEqual({ type: expectedWorkerType });
	expect(undefinedOptions.options).toEqual({ type: expectedWorkerType });
});

it("should keep ordinary and custom worker option handling", () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url), "chat");
	const custom = new CustomWorker(new URL("./worker.js", import.meta.url), "chat");
	const expected = { 0: "c", 1: "h", 2: "a", 3: "t", type: expectedWorkerType };
	expect(worker.options).toEqual(expected);
	expect(custom.options).toEqual(expected);
});
