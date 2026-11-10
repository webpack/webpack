export { default } from './late'
export const loadCycle = () =>
	import(/* webpackChunkName: 'inherits-late-cycle' */ './inherits-late-cycle')
