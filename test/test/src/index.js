import i18n from './i18n.js';
import { used } from './wtf.js';

const __ = i18n.__;

function xyz() {
    used();
    __( "abc" );
}
xyz();
