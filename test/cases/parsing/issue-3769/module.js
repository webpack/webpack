import { thing } from './a'

import user_settings_main            from './c'
import user_settings_change_password from './d'

export { test as myTest } from "./imported";

export { default as preload }        from './d?1'
export { default as snackbar }       from './d?2'
export { default as authentication } from './d?3'
export { default as navigator }      from './d?4'
export { default as locale }         from './d?5'
export { default as example_users }  from './d?6'
export { default as user_profile }   from './d?7'
export { default as block_user }     from './d?8'
export { default as log }            from './d?9'

export const user_settings = (thing, user_settings_main, user_settings_change_password)

