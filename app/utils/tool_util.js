var _ = require('underscore');
var fs = require("fs");
var url = require('url');
var path = require('path');
var http = require('http');
var https = require('https');
var qs = require('querystring');
var ip = require('ip');

var ErrUtils = require('./err_util');
var request = require('request');

var POST = 'POST';
var GET = 'GET';

var HEADER_USER_AGENT = 'User-Agent';
var HEADER_CONTENT_TYPE = 'Content-Type';
var HEADER_CONTENT_DISPOSITION = 'Content-Disposition';
var HEADER_X_FORWARD_FOR = 'x-forwarded-for';
var HEADER_CONTENT_LENGTH = 'Content-Length';
var HEADER_SPLITER = '\r\n';
var HEADER_SPLITER2 = '\r\n\r\n';
var STATUS_OK = 200;
var STATUS_NOT_FOUND = 404;

var HEADER_CONTENT_DISPOSITION_FORM_DATA = HEADER_CONTENT_DISPOSITION + ': form-data; ';
var DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13';
var CONTENT_TYPE_APPLICATION = 'application/x-www-form-urlencoded';
var CONTENT_TYPE_PLAIN_TEXT = 'text/plain';
var CONTENT_TYPE_MULTIPART = 'multipart/form-data; boundary=';
var CONTENT_BOUNDER_TAG = '--';

function BinaryBuffer(data) {
    return new Buffer(data, 'binary');
}

function Utf8Buffer(data) {
    return new Buffer(data, 'utf8');
}


function getByProtocol(protocol) {
    if (protocol === 'http:') return http.get;
    return https.get;
}

function requestByProtocol(protocol) {
    if (protocol === 'http:') return http.request;
    return https.request;
}

function processResponse(res, callback) {
    var data = '';
    res.on('data', function(chunk) {
        if (chunk && chunk !== '')
            data += chunk;
    });
    res.on('end', function() {
        if (res.statusCode != STATUS_OK)
            callback('Bad HTTP status code:' + res.statusCode, data);
        else
            callback(null, data);
    });
}

function extendHeaders(headers) {
    if (!headers) headers = {};
    Array.prototype.slice.call(arguments, 1).forEach(function(more_headers) {
        headers = _.defaults(headers, more_headers);
    });
    if (!headers[HEADER_USER_AGENT])(headers[HEADER_USER_AGENT] = DEFAULT_USER_AGENT);
    return headers;
}

function extendOptions(options) {
    if (!options) options = {};
    Array.prototype.slice.call(arguments, 1).forEach(function(more_options) {
        options = _.defaults(options, more_options);
    });
    return options;
}

function formatQueryValue(value) {
    if (!(value instanceof Buffer)) return qs.escape(value);
    for (var i = 0, hex = ''; i < value.length; ++i) {
        hex += '%' + value[i].toString(16).toUpperCase();
    }
    return hex;
}

function buildQueryString(obj) {
    var text = '';
    if (!obj) obj = {};
    _.each(obj, function(v, k) {
        if (text) text += '&';
        text += qs.escape(k) + '=' + formatQueryValue(v);
    });

    return text;
}

function buildQueryPath(path, parameters) {
    var content = buildQueryString(parameters);
    if (content.length > 0) {
        if (!~path.indexOf('?')) path += '?';
        path += content;
    }
    return path;
}

function getContentHeaders(type, length) {
    var headers = {};
    headers[HEADER_CONTENT_TYPE] = type;
    if (length !== undefined) headers[HEADER_CONTENT_LENGTH] = length;
    return headers;
}

function getRequestOptions(more_options, headers, more_headers, info) {
    more_headers = more_headers || {};

    return extendOptions(more_options, {
        host: info.hostname,
        port: info.port,
        path: info.path,
        method: info.method,
        headers: extendHeaders(headers, more_headers)
    });
}

function requestData(request, options, buffer, mutli, callback) {
    var req = request(options, function(res) {
        processResponse(res, callback);
    });

    if (buffer) {
        if (mutli) {
            buffer.forEach(function(data) {
                req.write(data);
            });
        } else {
            req.write(buffer);
        }
    }

    req.end();
    req.on('error', function(err) {
        console.log("err", err);
        callback(err);
    });
}

function getContentDispositionData(boundary, k, v) {
    return [CONTENT_BOUNDER_TAG, boundary, HEADER_SPLITER,
        HEADER_CONTENT_DISPOSITION_FORM_DATA, 'name="%s"'.format(k), HEADER_SPLITER2,
        v, HEADER_SPLITER
    ].join('');
}

function getContentDispositionFileHeader(boundary, file) {
    return [CONTENT_BOUNDER_TAG, boundary, HEADER_SPLITER,
        HEADER_CONTENT_DISPOSITION_FORM_DATA, 'name="%s"; filename="%s"'.format(file.name, path.basename(file.path)), HEADER_SPLITER,
        HEADER_CONTENT_TYPE, ': %s'.format(file.type || 'image/jpeg'), HEADER_SPLITER2
    ].join('');
}

function getContentDispositionFooter(boundary) {
    return [HEADER_SPLITER, CONTENT_BOUNDER_TAG, boundary, CONTENT_BOUNDER_TAG].join('');
}


//////////////////////////////////////////////////////////////
//
//////////////////////////////////////////////////////////////
exports.STATUS_OK = STATUS_OK;
exports.STATUS_NOT_FOUND = STATUS_NOT_FOUND;
exports.JSON_RESPONSE = "application/json; charset=utf-8";

exports.get = function(uri, parameters, files, callback, headers, more_options) {
    var info = url.parse(uri);
    var request = getByProtocol(info.protocol);

    info.path = buildQueryPath(info.path, parameters);
    info.method = GET;

    requestData(request,
        getRequestOptions(more_options, headers, {}, info),
        null,
        false,
        callback
    );
};

// exports.post = function(uri, parameters, files, callback, headers, more_options) {
//     var info = url.parse(uri);
//     var request = requestByProtocol(info.protocol);
//     var buffer, nparameters = {};

//     Object.keys(parameters).forEach(function(k) {
//         var v = parameters[k];
//         if (typeof v === 'object') {
//             nparameters[k] = tostr(v);
//         } else {
//             nparameters[k] = v;
//         }
//     });

//     buffer = Utf8Buffer(qs.stringify(nparameters || {}));
//     info.method = POST;

//     requestData(request,
//         getRequestOptions(more_options, headers, getContentHeaders(CONTENT_TYPE_APPLICATION, buffer.length), info),
//         buffer,
//         false,
//         callback
//     );
// };

exports.post = function(uri, parameters, files, callback, headers, more_options) {
    var formData = {};
    var nparameters = {};
    Object.keys(parameters).forEach(function(k) {
        var v = parameters[k];
        if (typeof v === 'object') {
            nparameters[k] = tostr(v);
        } else {
            nparameters[k] = v;
        }
    });
    if (files) {
        Object.keys(files).forEach(function(k) {
            v = files[k];
            formData[k] = fs.createReadStream(v.path);
        });
    }
    formData = _.extend(formData, nparameters);
    // console.log(uri);
    // console.log(formData);
    request.post({
            url: uri,
            formData: formData
        },
        function(err, httpResponse, body) {
            var result;
            if (err) {
                callback(err);
            }
            try {
                result = tojson(body);
            } catch (e) {
                result = ErrUtils.genError(500, body);
            }
            callback(null, result);
        });
};

exports.post = function(uri, body_params, callback, headers, more_options) {
    request.post({
            url: uri,
            body: body_params
        },
        function(err, httpResponse, body) {
            var result;
            if (err) {
                callback(err);
            }
            try {
                result = tojson(body);
            } catch (e) {
                result = ErrUtils.genError(500, body);
            }
            callback(null, result);
        });
};

//////////////////////////////////////////////////////////////
//
//////////////////////////////////////////////////////////////
exports.defaultResCallback = function(res) {
    return function(err, result) {
        if (err === null) {
            res.send(result);
        } else {
            ErrUtils.throwErrorToClient(res, err);
        }
    };
};

exports.defaultResMethodsAdapter = function(callback) {
    var cb;
    if (callback.adapter === undefined) {
        cb = function(err, result) {
            if (err) {
                callback(err, null);
                return;
            }
            var data = result.parse().getResult();
            if (data instanceof Error) {
                callback(data, null);
            } else {
                callback(null, data);
            }

        };
        cb.adapter = true;
    } else {
        cb = callback;
    }

    return cb;
};

//////////////////////////////////////////////////////////////
//
//////////////////////////////////////////////////////////////

exports.gen_content_type = function(mimetype) {
    return getContentHeaders(minetype);
};

exports.response_404 = function() {
    return "404 Not Found";
};

exports.getClientData = function(req) {
    return _.extend({}, req.params, req.body, req.query);
};

exports.getClientIp = function(req) {
    return req.headers[HEADER_X_FORWARD_FOR] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
};

exports.ip2int = function(address) {
    return ip.toLong(address);
};

exports.ipFrom = function(address) {
    return ip.fromLong(address);
};

exports.getUserCreateDate = function(req) {
    return req.session.create_date;
};

exports.getUserIdentID = function(req) {
    return req.session.uid;
};

exports.getUserRoleID = function(req) {
    return req.session.rid;
};

exports.getUserIdentName = function(req) {
    return req.session.full_name;
};

exports.getSourceUrl = function(sour, PORTAL_API_GLOBAL_PREFIX) {
    if (!sour) return [config.api_url.portal, PORTAL_API_GLOBAL_PREFIX].join('/');
    return config.api_url[sour];
};

//生成随机手机号
exports.getMoble = function() {
	var prefixArray = new Array("130", "131", "132", "133", "135", "137", "138", "170", "187", "189");
	var i = parseInt(10 * Math.random());
	var prefix = prefixArray[i];
	for (var j = 0; j < 8; j++) {
		prefix = prefix + Math.floor(Math.random() * 10);
	}
	return prefix;
};