"use strict";

const { Volume, createFsFromVolume } = require("memfs");
const FileStore = require("../lib/serialization/FileStore");
const { createLazy, isLazy } = require("../lib/serialization/Lazy");
const Serializer = require("../lib/serialization/Serializer");
const makeSerializable = require("../lib/util/makeSerializable");
const { registerNotSerializable } = require("../lib/util/serialization");

const TEST_REQUEST = "webpack/test/Serializer.unittest";

class InstanceSerializable {
	constructor(value = "", extra = "") {
		this.value = value;
		this.extra = extra;
	}

	serialize({ write }) {
		write(this.value);
		write(this.extra);
	}

	deserialize({ read }) {
		this.value = read();
		this.extra = read();
	}
}

makeSerializable(InstanceSerializable, TEST_REQUEST, "InstanceSerializable");

class StaticSerializable {
	constructor(value = "") {
		this.value = value;
		this.fromStaticDeserialize = false;
	}

	serialize({ write }) {
		write(this.value);
	}

	static deserialize({ read }) {
		const value = new StaticSerializable(read());
		value.fromStaticDeserialize = true;
		return value;
	}
}

makeSerializable(StaticSerializable, TEST_REQUEST, "StaticSerializable");

class CircularSerializable {
	constructor(name = "") {
		this.name = name;
		this.self = undefined;
	}

	serialize({ setCircularReference, write }) {
		setCircularReference(this);
		write(this.name);
		write(this.self);
	}

	deserialize({ setCircularReference, read }) {
		setCircularReference(this);
		this.name = read();
		this.self = read();
	}
}

makeSerializable(CircularSerializable, TEST_REQUEST, "CircularSerializable");

let lazyPayloadDeserializations = 0;

class LazyPayload {
	constructor(value = "") {
		this.value = value;
	}

	serialize({ write }) {
		write(this.value);
	}

	static deserialize({ read }) {
		lazyPayloadDeserializations++;
		return new LazyPayload(read());
	}
}

makeSerializable(LazyPayload, TEST_REQUEST, "LazyPayload");

class SeparateSerializable {
	constructor(value = undefined) {
		this.value = value;
	}

	serialize({ writeSeparate }) {
		writeSeparate(this.value, { name: "separate-value" });
	}

	deserialize({ read }) {
		this.value = read();
	}
}

makeSerializable(SeparateSerializable, TEST_REQUEST, "SeparateSerializable");

class NotSerializable {}

registerNotSerializable(NotSerializable);

describe("Serializer", () => {
	const roundTrip = (value, serializer = new Serializer()) =>
		serializer.deserialize(serializer.serialize(value));

	it("round-trips built-in values and object references", () => {
		const shared = { label: "shared" };
		const nullProto = Object.create(null);
		nullProto.value = "null prototype";

		const value = {
			array: [shared, shared],
			bigint: BigInt("-9007199254740993"),
			buffer: Buffer.from("hello serializer"),
			date: new Date("2026-05-16T12:34:56.789Z"),
			map: new Map([
				[shared, shared],
				["answer", 42]
			]),
			nullProto,
			numbers: [0, -0, 1, 0x100, -0x100, -1.25, Number.NaN, Infinity],
			regexp: /webpack/gi,
			set: new Set([shared, "item"]),
			string: "hello \u{1F600}"
		};
		value.self = value;

		const result = roundTrip(value);

		expect(result.self).toBe(result);
		expect(result.array[0]).toBe(result.array[1]);
		expect(result.map.get(result.array[0])).toBe(result.array[0]);
		expect(result.set.has(result.array[0])).toBe(true);
		expect(Buffer.isBuffer(result.buffer)).toBe(true);
		expect(result.buffer.toString()).toBe("hello serializer");
		expect(result.date).toBeInstanceOf(Date);
		expect(result.date.toISOString()).toBe("2026-05-16T12:34:56.789Z");
		expect(Object.getPrototypeOf(result.nullProto)).toBeNull();
		expect(result.nullProto.value).toBe("null prototype");
		expect(Object.is(result.numbers[1], -0)).toBe(true);
		expect(Number.isNaN(result.numbers[6])).toBe(true);
		expect(result.numbers[7]).toBe(Infinity);
		expect(result.bigint).toBe(BigInt("-9007199254740993"));
		expect(result.regexp.source).toBe("webpack");
		expect(result.regexp.flags).toBe("gi");
		expect(result.string).toBe("hello \u{1F600}");
	});

	it("round-trips registered classes with instance and static deserializers", () => {
		const result = roundTrip({
			instance: new InstanceSerializable("value", "extra"),
			static: new StaticSerializable("static")
		});

		expect(result.instance).toBeInstanceOf(InstanceSerializable);
		expect(result.instance).toEqual(new InstanceSerializable("value", "extra"));
		expect(result.static).toBeInstanceOf(StaticSerializable);
		expect(result.static.value).toBe("static");
		expect(result.static.fromStaticDeserialize).toBe(true);
	});

	it("round-trips registered circular objects when requested by the codec", () => {
		const value = new CircularSerializable("root");
		value.self = value;

		const result = roundTrip(value);

		expect(result).toBeInstanceOf(CircularSerializable);
		expect(result.name).toBe("root");
		expect(result.self).toBe(result);
	});

	it("keeps deserialized lazy values lazy until they are used", () => {
		const serializer = new Serializer();
		const value = createLazy(new LazyPayload("payload"), serializer);

		lazyPayloadDeserializations = 0;
		const result = serializer.deserialize(serializer.serialize(value));

		expect(isLazy(result, serializer)).toBe(true);
		expect(lazyPayloadDeserializations).toBe(0);
		expect(result()).toBeInstanceOf(LazyPayload);
		expect(result().value).toBe("payload");
		expect(lazyPayloadDeserializations).toBe(1);
		expect(result()).toBe(result());
	});

	it("stores separate values in a file store and restores them lazily", async () => {
		const fs = createFsFromVolume(new Volume());
		const fileStore = new FileStore(fs, "sha256");
		const filename = "/cache/index.pack";

		await fileStore.serialize(
			new SeparateSerializable({ message: "separate" }),
			{ filename }
		);
		const result = await fileStore.deserialize(null, { filename });

		expect(fs.existsSync("/cache/separate-value")).toBe(true);
		expect(result).toBeInstanceOf(SeparateSerializable);
		expect(isLazy(result.value, fileStore)).toBe(true);
		await expect(result.value()).resolves.toEqual({ message: "separate" });
	});

	it("returns null when the value is registered as not serializable", () => {
		expect(new Serializer().serialize(new NotSerializable())).toBeNull();
	});
});
