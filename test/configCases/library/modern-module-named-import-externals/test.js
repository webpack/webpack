// re export
export { a } from 'externals0'

// named import
import { a as a_2, HomeLayout as aaa } from 'externals1'
import { a as a_0 } from 'externals0'

// default import
import defaultValue from 'externals2'

// namespace import
import * as namespace from 'externals3'

// side effect only import
import 'externals4'

export { HomeLayout } from './lib'

{
    const HomeLayout_0 = 'HomeLayout_0';
    HomeLayout_0;
}
aaa;
a_0;
a_2;
defaultValue;
namespace;