const Queue = require("../lib/util/Queue");

describe("Queue", () => {
	it("constructor", () => {
		const q = new Queue(["item1", "item2", "item3"]);

		q.enqueue("item1");

		expect(q.dequeue()).toBe("item1");
		expect(q.dequeue()).toBe("item2");
		expect(q.dequeue()).toBe("item3");
		expect(q.dequeue()).toBeUndefined();

		q.enqueue("item2");
		q.enqueue("item3");

		expect(q.dequeue()).toBe("item2");
		expect(q.dequeue()).toBe("item3");
		expect(q.dequeue()).toBeUndefined();
	});

	it("enqueue and dequeue", () => {
		const q = new Queue();

		q.enqueue("item1");

		expect(q.dequeue()).toBe("item1");
		expect(q.dequeue()).toBeUndefined();

		q.enqueue("item2");
		q.enqueue("item3");

		expect(q.dequeue()).toBe("item2");
		expect(q.dequeue()).toBe("item3");
		expect(q.dequeue()).toBeUndefined();
	});

	it("length", () => {
		const q = new Queue();

		q.enqueue("item1");
		q.enqueue("item2");

		expect(q.length).toBe(2);

		q.dequeue();

		expect(q.length).toBe(1);

		q.dequeue();

		expect(q.length).toBe(0);
	});
});
