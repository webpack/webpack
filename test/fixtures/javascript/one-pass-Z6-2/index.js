const log = [];

function track(event) {
	if (!event) return;
	else log.push("event");
	log.push(event);
}

function flush(queue) {
	if (queue.length === 0) {
		return;
	} else {
		log.push("flush");
		log.push(queue.length);
	}
	queue.length = 0;
	log.push("done");
}

function each(items) {
	for (const item of items) {
		if (item === 0) continue;
		else log.push("item");
		log.push(item);
	}
}

track("a");
track("");
flush([1, 2]);
flush([]);
each([1, 0, 2]);
console.log(log.join());
