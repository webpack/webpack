const path = require("path");
const BinaryMiddleware = require("../lib/serialization/BinaryMiddleware");
const FileMiddleware = require("../lib/serialization/FileMiddleware");
const Serializer = require("../lib/serialization/Serializer");

const serializer = new Serializer([
	new BinaryMiddleware(),
	new FileMiddleware()
]);

const ESCAPE = null;
const ESCAPE_ESCAPE_VALUE = null;
const ESCAPE_END_OBJECT = true;
const ESCAPE_UNDEFINED = false;

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
	let currentReference = 0;
	let currentTypeReference = 0;
	let i = 0;
	const read = () => {
		return data[i++];
	};
	const printLine = content => {
		console.log(`${indent}${content}`);
	};
	printLine(`Version: ${read()}`);
	while (i < data.length) {
		const item = read();
		if (item === ESCAPE) {
			const nextItem = read();
			if (nextItem === ESCAPE_ESCAPE_VALUE) {
				printLine("null");
			} else if (nextItem === ESCAPE_UNDEFINED) {
				printLine("undefined");
			} else if (nextItem === ESCAPE_END_OBJECT) {
				indent = indent.slice(0, indent.length - 2);
				printLine(`} = #${currentReference++}`);
			} else if (typeof nextItem === "number" && nextItem < 0) {
				printLine(`Reference ${nextItem} => #${currentReference + nextItem}`);
			} else {
				const request = nextItem;
				if (typeof request === "number") {
					printLine(
						`Object (Reference ${request} => @${currentTypeReference -
							request}) {`
					);
				} else {
					const name = read();
					printLine(
						`Object (${request} / ${name} @${currentTypeReference++}) {`
					);
				}
				indent += "  ";
			}
		} else if (typeof item === "string") {
			if (item !== "") {
				printLine(`${JSON.stringify(item)} = #${currentReference++}`);
			} else {
				printLine('""');
			}
		} else if (Buffer.isBuffer(item)) {
			printLine(`buffer ${item.toString("hex")} = #${currentReference++}`);
		} else if (typeof item === "function") {
			const innerData = await item();
			printLine(`lazy {`);
			await printData(innerData, indent + "  ");
			printLine(`}`);
		} else {
			printLine(`${item}`);
		}
	}
};

const filename = process.argv[2];

console.log(`Printing content of ${filename}`);

serializer
	.deserializeFromFile(path.resolve(filename))
	.then(data => printData(data, ""));
