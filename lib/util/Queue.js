"use strict";

module.exports = class Queue {
	constructor(items) {
		this.first = null;
		this.last = null;
		this.length = 0;
		if(items) {
			for(const item of items) {
				this.enqueue(item);
			}
		}
	}

	enqueue(item) {
		const first = this.first;
		const node = {
			item,
			next: null
		};
		if(first === null) {
			this.last = node;
		} else {
			first.next = node;
		}
		this.first = node;
		this.length++;
	}

	dequeue() {
		const last = this.last;
		if(last === null)
			return undefined;
		const next = last.next;
		if(next === null) {
			this.first = null;
		}
		this.last = next;
		this.length--;
		return last.item;
	}
};
