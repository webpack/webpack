import TinyEmitter from 'tiny-emitter'

it("should load the component from container", () => {
	const emitter = new TinyEmitter()

	emitter.on('hello', () => {})

	expect(emitter.e.hello).toBeDefined();

	return import('service/emitter').then(({ emitter }) => {
		expect(emitter.e.hello).toBeDefined();
	})
});
