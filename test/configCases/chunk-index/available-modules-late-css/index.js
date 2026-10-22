export const load = () => import(/* webpackChunkName: 'parent' */ './parent-a');
export const later = () => import(/* webpackChunkName: 'q' */ './q');
