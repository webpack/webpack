import { NotHere as aaa, /* not here */ a } from "./aaa/index.js";
import { NotHere as bbb, /* not here */ b } from "./bbb/index.js";
import { NotHere as ccc, /* not here */ c } from "./ccc/index.js";
import { NotHere as ddd, /* not here */ d } from "./ddd/index.js";

let counter = 1;

function add() { counter++; }

it("should not add additional warnings/errors", () => {
	if (b) {
		if (d) add();
		// d(); // should not add error
		b();
		add();
		if (c) {
			b();
		}
	}

	(false && d);
	(d ? d() : add());

	expect(counter).toBe(2);
});

it("should do nothing", () => {
	expect(aaa).toBe(undefined);
	expect(bbb).toBe(undefined);
	expect(ccc).toBe(undefined);
	expect(ddd).toBe(undefined);
});
