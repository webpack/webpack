// The config case's `it` and `expect`, logging what each assertion reads,
// so a print that changes a value or a throw runs otherwise.
var show = function (value) {
	if (typeof value === "function") return "[function]";
	try {
		return String(JSON.stringify(value, function (key, one) {
			return typeof one === "bigint" ? one + "n" : typeof one === "function" ? "[function]" : one;
		}));
	} catch (error) {
		return String(value);
	}
};
var it = function (title, body) {
	console.log("it", title);
	try {
		body(function () {});
	} catch (error) {
		console.log("throws", error && error.name);
	}
};
var expect = function (value) {
	var matchers = new Proxy({}, {
		get: function (target, name) {
			if (name === "not" || name === "resolves" || name === "rejects") return matchers;
			return function () {
				if (/Snapshot$/.test(name)) return;
				if (/^toThrow/.test(name) && typeof value === "function") {
					try {
						console.log(name, "returns", show(value()));
					} catch (error) {
						console.log(name, "throws", error && error.name);
					}
					return;
				}
				console.log(name, show(value));
			};
		}
	});
	return matchers;
};

const log = [];

function record(value) {
	log.push(value);
	return value;
}

async function awaited(f) {
	const value = f(1);
	return await value;
}

async function awaitedFirst(f) {
	const value = f(2);
	await 0;
	return record(value);
}

function* yielded(f) {
	const value = f(3);
	yield value;
}

function* delegated(f) {
	const value = f(4);
	yield* value;
}

function* bare(f) {
	const value = f(5);
	yield;
	record(value);
}

function assigned(list) {
	let add;
	add = (x) => x + 1;
	return list.map(add);
}

function assignedObject(list) {
	var table;
	table = { double: (x) => x * 2 };
	return [list.length, table];
}

function assignedTwice(list) {
	let add;
	add = (x) => x + 1;
	list.forEach(add);
	return add;
}

function register(registry) {
	var handler;
	handler = (x) => x + 1;
	registry.add([handler]);
}

function registerTable(registry) {
	var table;
	table = { double: (x) => x * 2 };
	registry.add(table);
}

function counted(registry, start) {
	var count;
	count = start;
	registry.add(count);
}

function stepped(registry, start) {
	var step = start;
	step += 1;
	registry.add(step);
}

it("should fold a value into what an `await` hands over", async () => {
	log.length = 0;
	expect(await awaited(record)).toBe(1);
	expect(await awaitedFirst(record)).toBe(2);
	expect(log).toEqual([1, 2, 2]);
});

it("should fold a value into what a `yield` hands over, but not past a bare one", () => {
	log.length = 0;
	expect([...yielded(record)]).toEqual([3]);
	expect([...delegated(() => record([4]))]).toEqual([4]);
	expect([...bare(record)]).toEqual([undefined]);
	expect(log).toEqual([3, [4], 5, 5]);
});

it("should fold a function or object assigned to a name read once into that read", () => {
	expect(assigned([1, 2])).toEqual([2, 3]);
	expect(assignedObject([1])[1].double(3)).toBe(6);
	expect(assignedTwice([])(1)).toBe(2);
	const added = [];
	const registry = { add: (value) => added.push(value) };
	register(registry);
	register(registry);
	registerTable(registry);
	registerTable(registry);
	expect(added[0][0](1)).toBe(2);
	expect(added[3].double(2)).toBe(4);
	counted(registry, 5);
	counted(registry, 6);
	stepped(registry, 7);
	stepped(registry, 8);
	expect(added.slice(4)).toEqual([5, 6, 8, 9]);
});
