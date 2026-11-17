
        export { foo0 as "~123" } from './mod0.js';
        export { foo1 as "ab cd" } from './mod1.js';
        export { foo2 as "not identifier" } from './mod2.js';
        export { foo3 as "-notidentifier" } from './mod3.js';
        export { foo4 as "%notidentifier" } from './mod4.js';
        export { foo5 as "@notidentifier" } from './mod5.js';
        export { foo6 as " notidentifier" } from './mod6.js';
        export { foo7 as "notidentifier " } from './mod7.js';
        export { foo8 as " notidentifier " } from './mod8.js';