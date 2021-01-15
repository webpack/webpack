let warnings = [];
let oldWarn;

beforeEach(done => {
	oldWarn = console.warn;
	console.warn = m => warnings.push(m);
	done();
});

afterEach(done => {
	expectWarning();
	console.warn = oldWarn;
	done();
});

const expectWarning = regexp => {
	if (!regexp) {
		expect(warnings).toEqual([]);
	} else {
		expect(warnings).toEqual(
			expect.objectContaining({
				0: expect.stringMatching(regexp),
				length: 1
			})
		);
	}
	warnings.length = 0;
};

it("should load the component from container", () => {
	return import("./App").then(({ default: App }) => {
		expectWarning(
			/Unsatisfied version 8 of shared singleton module react \(required \^2\)/
		);
		const rendered = App();
		expect(rendered).toBe(
			"App rendered with [This is react 8] and [This is react 2.1.0] and [This is react 8] and [ComponentC rendered with [This is react 8] and [ComponentA rendered with [This is react 8]] and [ComponentB rendered with [This is react 8]]]"
		);
		return import("./upgrade-react").then(({ default: upgrade }) => {
			upgrade();
			const rendered = App();
			expect(rendered).toBe(
				"App rendered with [This is react 9] and [This is react 2.1.0] and [This is react 9] and [ComponentC rendered with [This is react 9] and [ComponentA rendered with [This is react 9]] and [ComponentB rendered with [This is react 9]]]"
			);
		});
	});
});

import Self from "./Self";

it("should load itself from its own container", () => {
	return import("self/Self").then(({ default: RemoteSelf }) => {
		expect(RemoteSelf).toBe(Self);
	});
});
