export const modules = import.meta.glob('./*.js', { eager: true })
export const withoutSelf = import.meta.glob(['./*.js', '!./importer.js'], {
	eager: true
})
