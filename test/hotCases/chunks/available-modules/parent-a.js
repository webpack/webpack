export const load = () => import(/* webpackChunkName: 'child' */ './child');
module.hot.accept();
