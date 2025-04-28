import { FluentProvider } from './module.js';

export {
  FluentProvider,
  myFunction,
} from './module.js';


export async function component() {
  const { value } = await import(/* webpackChunkName: "async-module" */ './async-module.js');

  return value;
}

const qT = "qT";

it("should work", async function() {
	const value = await component();

	expect(qT).toBe("qT");
	expect(value).toBe("value");
	expect(FluentProvider()).toBe("FluentProvider");
});
