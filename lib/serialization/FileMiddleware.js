/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const fs = require("fs");
const mkdirp = require("mkdirp");
const path = require("path");
const Queue = require("../util/Queue");
const memorize = require("../util/memorize");
const SerializerMiddleware = require("./SerializerMiddleware");

class Section {
	constructor(items) {
		this.items = items;
		this.parts = undefined;
		this.length = NaN;
		this.offset = NaN;
	}

	resolve() {
		let hasPromise = false;
		let lastPart = undefined;
		const parts = [];
		let length = 0;
		for (const item of this.items) {
			if (typeof item === "function") {
				const r = item();
				if (r instanceof Promise) {
					parts.push(r.then(items => new Section(items).resolve()));
					hasPromise = true;
				} else if (r) {
					parts.push(new Section(r).resolve());
				} else {
					return null;
				}
				length += 12; // 0, offset, size
				lastPart = undefined;
			} else if (lastPart) {
				lastPart.push(item);
				length += item.length;
			} else {
				length += 4; // size
				length += item.length;
				lastPart = [item];
				parts.push(lastPart);
			}
		}
		this.length = length;
		if (hasPromise) {
			return Promise.all(parts).then(parts => {
				this.parts = parts;
				if (!parts.every(Boolean)) return null;
				return this;
			});
		} else {
			this.parts = parts;
			return this;
		}
	}

	getSections() {
		return this.parts.filter(p => p instanceof Section);
	}

	emit(out) {
		for (const part of this.parts) {
			if (part instanceof Section) {
				const pointerBuf = Buffer.alloc(12);
				pointerBuf.writeUInt32LE(0, 0);
				pointerBuf.writeUInt32LE(part.offset, 4);
				pointerBuf.writeUInt32LE(part.length, 8);
				out.push(pointerBuf);
			} else {
				const sizeBuf = Buffer.alloc(4);
				out.push(sizeBuf);
				let len = 0;
				for (const buf of part) {
					len += buf.length;
					out.push(buf);
				}
				sizeBuf.writeUInt32LE(len, 0);
			}
		}
	}
}

/**
 * @typedef {Object} FileJob
 * @property {boolean} write
 * @property {(fileHandle: number, callback: (err: Error?) => void) => void} fn
 * @property {(err: Error?) => void} errorHandler
 */

class FileManager {
	constructor() {
		/** @type {Map<string, Queue<FileJob>>} */
		this.jobs = new Map();
		this.processing = new Map();
	}

	addJob(filename, write, fn, errorHandler) {
		let queue = this.jobs.get(filename);
		let start = false;
		if (queue === undefined) {
			queue = new Queue();
			this.jobs.set(filename, queue);
			start = true;
		}
		queue.enqueue({
			write,
			fn,
			errorHandler
		});
		if (start) {
			this._startProcessing(filename, queue);
		}
	}

	/**
	 * @param {string} filename the filename
	 * @param {Queue<FileJob>} queue the job queue
	 * @returns {void}
	 */
	_startProcessing(filename, queue) {
		let fileHandle;
		let write = false;
		/** @type {FileJob | undefined} */
		let currentJob = undefined;
		/**
		 * Pull the next job from the queue, and process it
		 * When queue empty and file open, close it
		 * When queue (still) empty and file closed, exit processing
		 * @returns {void}
		 */
		const next = () => {
			if (queue.length === 0) {
				if (fileHandle !== undefined) {
					closeFile(next);
				} else {
					this.jobs.delete(filename);
					this.processing.delete(filename);
				}
				return;
			}
			currentJob = queue.dequeue();
			// If file is already open but in the wrong mode
			// close it and open it the other way
			if (fileHandle !== undefined && write !== currentJob.write) {
				closeFile(openFile);
			} else {
				openFile();
			}
		};
		/**
		 * Close the file and continue with the passed next step
		 * @param {function(): void} next next step
		 * @returns {void}
		 */
		const closeFile = next => {
			fs.close(fileHandle, err => {
				if (err) return handleError(err);
				fileHandle = undefined;
				next();
			});
		};
		/**
		 * Open the file if needed and continue with job processing
		 * @returns {void}
		 */
		const openFile = () => {
			if (fileHandle === undefined) {
				write = currentJob.write;
				fs.open(filename, write ? "w" : "r", (err, file) => {
					if (err) return handleError(err);
					fileHandle = file;
					process();
				});
			} else {
				process();
			}
		};
		/**
		 * Process the job function and continue with the next job
		 * @returns {void}
		 */
		const process = () => {
			currentJob.fn(fileHandle, err => {
				if (err) return handleError(err);
				currentJob = undefined;
				next();
			});
		};
		/**
		 * Handle any error, continue with the next job
		 * @param {Error} err occured error
		 * @returns {void}
		 */
		const handleError = err => {
			if (currentJob !== undefined) {
				currentJob.errorHandler(err);
			} else {
				console.error(`Error in FileManager: ${err.message}`);
			}
			next();
		};
		next();
	}
}
const fileManager = new FileManager();

const createPointer = (filename, offset, size) => {
	return memorize(() => {
		return new Promise((resolve, reject) => {
			fileManager.addJob(
				filename,
				false,
				(file, callback) => {
					readSection(filename, file, offset, size, (err, parts) => {
						if (err) return callback(err);
						resolve(parts);
						callback();
					});
				},
				reject
			);
		});
	});
};

const readSection = (filename, file, offset, size, callback) => {
	const buffer = Buffer.alloc(size);
	fs.read(file, buffer, 0, size, offset, err => {
		if (err) return callback(err);

		const result = [];
		let pos = 0;
		while (pos < buffer.length) {
			const len = buffer.readUInt32LE(pos);
			pos += 4;
			if (len === 0) {
				const pOffset = buffer.readUInt32LE(pos);
				pos += 4;
				const pSize = buffer.readUInt32LE(pos);
				pos += 4;
				result.push(createPointer(filename, pOffset, pSize));
			} else {
				const buf = buffer.slice(pos, pos + len);
				pos += len;
				result.push(buf);
			}
		}
		callback(null, result);
	});
};

class FileMiddleware extends SerializerMiddleware {
	/**
	 * @param {any[]} data data items
	 * @param {TODO} context TODO
	 * @returns {any[]|Promise<any[]>} serialized data
	 */
	serialize(data, { filename }) {
		const root = new Section(data);

		const r = root.resolve();

		return Promise.resolve(r).then(root => {
			if (!root) return null;
			// calc positions in file
			let currentOffset = 4;
			const processOffsets = section => {
				section.offset = currentOffset;
				currentOffset += section.length;
				for (const child of section.getSections()) {
					processOffsets(child);
				}
			};
			processOffsets(root);

			// get buffers to write
			const sizeBuf = Buffer.alloc(4);
			sizeBuf.writeUInt32LE(root.length, 0);
			const buffers = [sizeBuf];
			const emit = (section, out) => {
				section.emit(out);
				for (const child of section.getSections()) {
					emit(child, out);
				}
			};
			emit(root, buffers);

			// write to file
			return new Promise((resolve, reject) => {
				mkdirp(path.dirname(filename), err => {
					if (err) return reject(err);
					fileManager.addJob(filename, true, (file, callback) => {
						fs.writeFile(file, Buffer.concat(buffers), err => {
							if (err) return callback(err);
							resolve(true);
							callback();
						});
					});
				});
			});
		});
	}

	/**
	 * @param {any[]} data data items
	 * @param {TODO} context TODO
	 * @returns {any[]|Promise<any[]>} deserialized data
	 */
	deserialize(data, { filename }) {
		return new Promise((resolve, reject) => {
			fileManager.addJob(
				filename,
				false,
				(file, callback) => {
					const sizeBuf = Buffer.alloc(4);
					fs.read(file, sizeBuf, 0, 4, 0, err => {
						if (err) return callback(err);

						const rootSize = sizeBuf.readUInt32LE(0);

						readSection(filename, file, 4, rootSize, (err, parts) => {
							if (err) return callback(err);

							resolve(parts);
							callback();
						});
					});
				},
				reject
			);
		});
	}
}

module.exports = FileMiddleware;
