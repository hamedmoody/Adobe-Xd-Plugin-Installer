const os                = require("os");
const fs                = require("fs");
const https             = require('https')
const user_home_dir     = os.homedir();
const AdmZip            = require("adm-zip");
const request           = require('sync-request');
const downloadFileSync  = require('download-file-sync');

const temp_file         = 'tmp-plugin.xdx';

const xdPath            = user_home_dir + '\\AppData\\Roaming\\Adobe\\UXP\\';
const xdInfoPath        = `${xdPath}PluginsInfo\\v1\\XD.json`;
const xdInfoPathBackup  = `${xdPath}PluginsInfo\\v1\\XD-backup.json`;
const plugin_base_url   = 'https://dl.daneshjooyar.com/mvie/Moodi_Hamed/Adobe-Xd/plugins/';

let args                = process.argv.filter( arg => arg.indexOf('install=') === 0 );
if( ! args.length ){
    console.log('Plugin params not sent');
    return;
}

if( ! fs.existsSync( xdInfoPathBackup ) ){
    fs.copyFileSync( xdInfoPath, xdInfoPathBackup );
    console.log('Xd info plugins backed up');
}

let xd_plugins_info     = JSON.parse( fs.readFileSync( xdInfoPath ) );

let requested_plugin    = args[0].substring(8) + '.xdx';

let result              = request('GET', 'https://dl.daneshjooyar.com/mvie/Moodi_Hamed/Adobe-Xd/plugins/plugins.json');
let remote_plugins      = JSON.parse( result.body );

let founded_plugin       = false;
for( let i = 0; i < remote_plugins.plugins.length; i++ ){
    if( remote_plugins.plugins[i].file === requested_plugin ){
        founded_plugin = remote_plugins.plugins[i];
        break
    }
}
console.log(founded_plugin)
if( ! founded_plugin ){
    console.log('Not found plugin');
    return;
}

let plugin_url      = plugin_base_url + founded_plugin.file;
let plugin_path     = `${xdPath}Plugins\\External\\${founded_plugin.id}_${founded_plugin.version}`;

console.log('Downloading...');
const file          = fs.createWriteStream( temp_file );
const file_request  = https.get(plugin_url, function(response) {
    response.pipe(file);
    // after download completed close filestream
    file.on("finish", () => {
        file.close();

        const zip = new AdmZip( temp_file );

        zip.extractAllTo( plugin_path );

        /**
         * add active in xd plugin info
         */
        let new_plugin_data = {
            hostMinVersion  : founded_plugin.min_version,
            name            : founded_plugin.name,
            path            : '$localPlugins\\External\\' + founded_plugin.id + '_' + founded_plugin.version,
            pluginId        : founded_plugin.id,
            status          : 'enabled',
            type            : 'uxp',
            versionString   : founded_plugin.version
        };

        let pluginInfoIndex = xd_plugins_info.plugins.findIndex( ( item ) => {
            return item.pluginId === new_plugin_data.pluginId;
        } );

        if( pluginInfoIndex >= 0 ){
            xd_plugins_info.plugins[pluginInfoIndex] = new_plugin_data;
        }else{
            xd_plugins_info.plugins.push( new_plugin_data );
        }

        fs.writeFileSync( xdInfoPath, JSON.stringify( xd_plugins_info ), {

        } );

        setTimeout( delete_temp, 1000 );

        console.log('Plugin Installed, Please Restart xd');


    });
});

function delete_temp(){
    fs.unlinkSync( temp_file );
    process.exit();
}

//console.log(result)