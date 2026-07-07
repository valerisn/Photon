fx_version 'cerulean'
game 'common'

name 'Photon'
description 'Client-side screenshot capture and upload for FiveM'
author 'Photon'
version '1.0.0'

client_script 'dist/client.js'
server_script 'dist/server.js'

dependency 'yarn'
dependency 'webpack'

webpack_config 'client.config.js'
webpack_config 'server.config.js'
webpack_config 'ui.config.js'

files {
    'dist/ui.html'
}

ui_page 'dist/ui.html'