var util = require('util');
var ErrCode = require('../common/errcode');
var ErrUtils = require('./err_util');

String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

////////////////////////////////////////////////////
// Error Generator
////////////////////////////////////////////////////

(function () {
    Object.keys(ErrCode).forEach(function (k) {
        var err_func_name = k.split('_').map(function (kk) {return kk.toLowerCase().capitalize();}).join('');
        exports[err_func_name] = function (detail) {
            return new ClientError(ErrCode[k], null, detail);
        };
    });
})();

////////////////////////////////////////////////////
// Common Error
////////////////////////////////////////////////////

function ClientError(err, msg, detail)
{
    if (typeof err === 'object') {
        this.code = err.code; this.msg = err.zh;
    } else {
        this.code = err; this.msg = msg||'服务器未知错误';
    }

    if (detail) {
        this.detail = detail;
    }
}

ClientError.prototype = Error.prototype;

////////////////////////////////////////////////////
// Error Utils
////////////////////////////////////////////////////

exports.genError = function (err, msg, detail) {
    return new ClientError(err, msg, detail);
};

exports.throwErrorToClient = function(res, err) {
    res.send(err);
};

////////////////////////////////////////////////////
//
////////////////////////////////////////////////////

exports.Error404 = function(){
    return new ClientError(404, "Not Found API");
};

exports.Error500 = function(){
    return new ClientError(500);
};

exports.ResponseOK = function () {
    return {"code":0, "msg":"Api call succeed!"};
};

exports.ResponseOKWithData = function (data) {
    if (data === null) return exports.ResponseOK ();
    return {"code":0, "data":data};
};

