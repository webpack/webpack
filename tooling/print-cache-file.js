const path = require("path");
const BinaryMiddleware = require("../lib/serialization/BinaryMiddleware");
const FileMiddleware = require("../lib/serialization/FileMiddleware");
const Serializer = require("../lib/serialization/Serializer");

const serializer = new Serializer([
	new BinaryMiddleware(),
	new FileMiddleware()
]);

const ESCAPE = null;
const ESCAPE_ESCAPE_VALUE = 1;
const ESCAPE_END_OBJECT = 2;
const ESCAPE_UNDEFINED = 3;

const printData = async (data, indent) => {
	if (!Array.isArray(data)) throw new Error("Not an array");
	if (Buffer.isBuffer(data[0])) {
		for (const b of data) {
			if (typeof b === "function") {
				const innerData = await b();
				console.log(`${indent}= lazy {`);
				await printData(innerData, indent + "  ");
				console.log(`${indent}}`);
			} else {
				console.log(`${indent}= ${b.toString("hex")}`);
			}
		}
		return;
	}
	let i = 0;
	const read = () => {
		return data[i++];
	};
	console.log(`${indent}Version: ${read()}`);
	while (i < data.length) {
		const item = read();
		if (item === ESCAPE) {
			const nextItem = read();
			if (nextItem === ESCAPE_ESCAPE_VALUE) {
				console.log(`${indent}- null`);
			} else if (nextItem === ESCAPE_UNDEFINED) {
				console.log(`${indent}- undefined`);
			} else if (nextItem === ESCAPE_END_OBJECT) {
				indent = indent.slice(0, indent.length - 2);
				console.log(`${indent}}`);
			} else if (typeof nextItem === "number") {
				console.log(`${indent}- Reference ${nextItem}`);
			} else {
				let name = read();
				console.log(`${indent}- Object (${name}) {`);
				indent += "  ";
			}
		} else if (typeof item === "string") {
			console.log(`${indent}- string ${JSON.stringify(item)}`);
		} else if (Buffer.isBuffer(item)) {
			console.log(`${indent}- buffer ${item.toString("hex")}`);
		} else if (typeof item === "function") {
			const innerData = await item();
			console.log(`${indent}- lazy {`);
			await printData(innerData, indent + "  ");
			console.log(`${indent}}`);
		}
	}
};

const filename = process.argv[2];

console.log(`Printing content of ${filename}`);

serializer
	.deserializeFromFile(path.resolve(filename))
	.then(data => printData(data, ""));
