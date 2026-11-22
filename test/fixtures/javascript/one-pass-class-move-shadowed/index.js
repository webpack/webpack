function inBlock(x) {
	class BlockReader {
		read() {
			return x;
		}
	}
	{
		let x = 2;
		console.log(x);
		return new BlockReader().read();
	}
}
console.log(inBlock(1));
function inCatch(x) {
	class CatchReader {
		read() {
			return x;
		}
	}
	try {
		throw 2;
	} catch (x) {
		return new CatchReader().read();
	}
}
console.log(inCatch(1));
function inCase(x) {
	class CaseReader {
		read() {
			return x;
		}
	}
	switch (x) {
		case 1:
			const [x] = [7];
			return new CaseReader().read() + x;
	}
}
console.log(inCase(1));
function unshadowed(x) {
	class FreeReader {
		read() {
			return x;
		}
	}
	{
		let y = 2;
		return new FreeReader().read() + y;
	}
}
console.log(unshadowed(1));
