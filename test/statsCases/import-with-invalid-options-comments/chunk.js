export default function() {
    import(/* webpackPrefetch: true, webpackChunkName: notGoingToCompileChunkName */ "./chunk-a");
    import(/* webpackPrefetch: 0, webpackChunkName: "goingToCompileChunkName-b" */ "./chunk-b");
    import(/* webpack Prefetch: 0, webpackChunkName: "notGoingToCompile-c" */ "./chunk-c");
    import(/* webpackPrefetch: nope */ /* webpackChunkName: "yep" */ "./chunk-d");
}
