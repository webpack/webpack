export default 'module-a'

export const loadInherits = () =>
	import(/* webpackChunkName: 'inherits-late' */ './inherits-late')
export const loadKeeps = () =>
	import(/* webpackChunkName: 'keeps-late' */ './keeps-late')
