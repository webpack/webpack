export class Emitter {
	constructor() {
		this.listeners = new Map();
	}

	on(event, listener) {
		const listeners = this.listeners.get(event) || new Set();
		listeners.add(listener);
		this.listeners.set(event, listeners);
		return () => this.off(event, listener);
	}

	once(event, listener) {
		const off = this.on(event, (...args) => {
			off();
			listener(...args);
		});
		return off;
	}

	off(event, listener) {
		const listeners = this.listeners.get(event);
		if (listeners) listeners.delete(listener);
	}

	emit(event, ...args) {
		const listeners = this.listeners.get(event);
		if (!listeners) return false;
		for (const listener of [...listeners]) listener(...args);
		return true;
	}
}
