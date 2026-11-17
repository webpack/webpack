
        export {
          foo,
          foo1 as foo2,
          " {left-curlybrace ",
          " {curly-brackets}" as "@notidentifier",
          "?" as "identifier",
        } from './mod0.js';
        export { "p as 'z' from 'asdf'" as "z'" } from 'asdf';
        export { "z'" as "p as 'z' from 'asdf'" } from 'asdf';