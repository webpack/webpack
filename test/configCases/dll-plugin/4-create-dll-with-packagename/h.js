import mod from "module-with-closure-state/index";

export default () => {
    mod.set('set inside dll');
}
