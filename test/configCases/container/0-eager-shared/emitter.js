import { TinyEmitter } from 'tiny-emitter'

const emitter = new TinyEmitter()

emitter.on('hello', () => console.log('hello[service]'))

export {
	emitter,
}
