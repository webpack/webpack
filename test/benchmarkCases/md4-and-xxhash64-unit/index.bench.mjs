import crypto from "crypto";
import createHash from "../../../lib/util/createHash.js";

function factoryXxhash64(longString) {
	return function xxhash64String() {
		const hash = createHash("xxhash64");
		hash.update(longString);
		return hash.digest("hex");
	};
}

function factoryMd4(longString) {
	return function md4String() {
		const hash = createHash("md4");
		hash.update(longString);
		return hash.digest("hex");
	};
}

export default function xxhash64AndMd4Benchmarks(suite) {
	for (const size of [
		1, 10, 20, 40, 60, 80, 100, 200, 400, 1000, 1001, 5000, 8183, 8184, 8185,
		10000, 20000, 32768, 32769, 50000, 100000, 200000
	]) {
		const longString = crypto.randomBytes(size).toString("hex");
		const subName1 = `string benchmark (length: ${longString.length})`;

		const fn1 = factoryXxhash64(longString);
		const fn2 = factoryMd4(longString);

		suite.add(`xxhash64 ${subName1}`, fn1, {
			beforeAll() {
				this.collectBy = subName1;
			}
		});

		suite.add(`md4 ${subName1}`, fn2, {
			beforeAll() {
				this.collectBy = subName1;
			}
		});

		const bufferSize = size * 2;
		const buffer = crypto.randomBytes(bufferSize);
		const subName2 = `buffer benchmark (size: ${bufferSize})`;

		const fn3 = factoryXxhash64(buffer);
		const fn4 = factoryMd4(buffer);

		suite.add(`xxhash64 ${subName2}`, fn3, {
			beforeAll() {
				this.collectBy = subName2;
			}
		});

		suite.add(`md4 ${subName2}`, fn4, {
			beforeAll() {
				this.collectBy = subName2;
			}
		});
	}
}
