var _ = require('underscore');
var default_config = require('./default');
var md5 = require('MD5');

global.tojson = JSON.parse;
global.md5 = md5;

module.exports = (function () {
	try {
        var version = (process.env.PORTAL_VERSION || 'development').toLowerCase();
        var ver_config = require('./' + version), config  = _.extend(default_config, ver_config);
        return config;
    } catch (err) {
        console.log("Cannot config file!!!");
        process.exit(-1);
    }
})();