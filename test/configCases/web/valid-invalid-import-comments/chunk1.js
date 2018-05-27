export default function() {
    import(/* webpackPrefetch: true, webpackChunkName: notGoingToCompileChunkName */ "./chunk1-a");
    import(/* webpackPrefetch: 0, webpackChunkName: "goingToCompileChunkName-b" */ "./chunk1-b");
    import(/* webpack Prefetch: 0, webpackChunkName: "notGoingToCompile-c" */ "./chunk1-c");
}
