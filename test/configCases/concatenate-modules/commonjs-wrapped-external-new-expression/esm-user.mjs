// required by a CommonJS module, so wrapping propagates from here to the
// external: the default import becomes the external's accessor call
import EventEmitter from "events";

export function make() {
	return new EventEmitter();
}

export const raw = EventEmitter;
