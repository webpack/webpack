import * as pureStyle from "./style.css";
import * as styles from "./style.modules.css";

it("should work", done => {
	expect(pureStyle).toEqual(nsObj({}));
	const style = getComputedStyle(document.body);
	expect(style.getPropertyValue("background")).toBe(" red");
  expect(styles.foo).toBe('_style_modules_css-foo');

	import(/* webpackPrefetch: true */ "./style2.css").then(x => {
		expect(x).toEqual(nsObj({}));
		const style = getComputedStyle(document.body);
		expect(style.getPropertyValue("color")).toBe(" blue");

		import(/* webpackPrefetch: true */ "./style2.modules.css").then(x => {
		  expect(x.bar).toBe("_style2_modules_css-bar");
			done();
		}, done);
	}, done);
});

it("should work in worker", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url), {
		type: "module"
	});
	worker.postMessage("ok");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("data: _style_modules_css-foo _style2_modules_css-bar _style3_modules_css-baz, thanks");
	await worker.terminate();
});
