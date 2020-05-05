it("should load the component from container", () => {
	return import("./App").then(({ default: App }) => {
		const rendered = App();
		expect(rendered).toBe(
			"App rendered with [This is react 8] and [ComponentC rendered with [This is react 8] and [ComponentA rendered with [This is react 8]] and [ComponentB rendered with [This is react 8]]]"
		);
		return import("./upgrade-react").then(({ default: upgrade }) => {
			upgrade();
			const rendered = App();
			expect(rendered).toBe(
				"App rendered with [This is react 9] and [ComponentC rendered with [This is react 9] and [ComponentA rendered with [This is react 9]] and [ComponentB rendered with [This is react 9]]]"
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
