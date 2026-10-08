export { default } from './late-dep'
export const loadBack = () =>
	import(/* webpackChunkName: 'inherits-late' */ './inherits-late')
