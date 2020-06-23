export function getRemoteModule() {
    return import(/* webpackPrefetch: true */ "remote/async-module");
}