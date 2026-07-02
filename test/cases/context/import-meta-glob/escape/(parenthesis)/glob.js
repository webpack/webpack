export const relative = import.meta.glob('./mod/**/*.js', {
  eager: true,
  import: 'default',
})
