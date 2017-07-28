var express = require('express');
var router = express.Router();
var config = require('../config');
var _ = require('underscore');
var UUID = require('uuid');
var sha1 = require('node-sha1');
var tool_util = require('./../app/utils/tool_util');
var http = require('http');
var moment = require('moment');
var request = require('request');
var qs = require('querystring');
var ErrUtils = require('./../app/utils/err_util');

/**
 * 微信消息API
 * @param 
 * @return 
 */
router.get('/', function(req, res, next) {
	web_token = UUID.v1();
	nonce = UUID.v4();
	number = tool_util.getMoble();
	email = number + "@qq.com";
	timestamp = moment().format("YYYYMMDDHHmmss");
	secret = config['secret'];
	sign_str = "number=" + number + "&email=" + email + "&timestamp=" + timestamp + "&" + secret;
	sign = md5(sign_str).toUpperCase();
	message_id = UUID.v1();
	var company_res = {
		number: number,
		email: email,
		timestamp: timestamp,
		sign: sign,
		message_id: message_id,
		content: "this is text",
		create_time: new Date().getTime(),
		open_id: 'oImr8t02SskaichIIPAT8TvVtzWM'
	}
	company_res = _.extend(company_res, config);
	console.log("res", company_res);
  res.render('weixin_api', {company_res: company_res});
});

/**
 * 微信消息API 测试接收消息通道是否正常
 * @param 
 * @return 
 */
router.get('/test', function(req, res, next) {
	res.type(tool_util.JSON_RESPONSE);
	web_token = UUID.v1();
	nonce = UUID.v4();
	number = tool_util.getMoble();
	email = number + "@qq.com";
	timestamp = moment().format("YYYYMMDDHHmmss");
	secret = config['secret'];
	sign_str = "number=" + number + "&email=" + email + "&timestamp=" + timestamp + "&" + secret;
	sign = md5(sign_str).toUpperCase();
	callback_url = "http://" + config['company_domain'] + "/spa1/im_callback/test?number="+number+"&email="+email+"&timestamp="+timestamp+"&sign="+sign
	console.log("send_message_url", callback_url);
	tool_util.get(callback_url, {}, null, function(err, result) {
		console.log("send_message_res", result);
  	res.send(result);
	});
});

/**
 * 微信消息API Udesk接收文本消息
 * @param 
 * @return 
 */
router.post('/send_message', function(req, res, next) {
	res.type(tool_util.JSON_RESPONSE);
	params = req.body;
	number = params['number'];
	email = params['email'];
	timestamp = params['timestamp'] || moment().format("YYYYMMDDHHmmss");
	secret = config['secret'];
	sign_str = "number=" + number + "&email=" + email + "&timestamp=" + timestamp + "&" + secret;
	sign = md5(sign_str).toUpperCase();
	callback_url = "http://" + config['company_domain'] + "/spa1/im_callback?number="+number+"&email="+email+"&timestamp="+timestamp+"&sign="+sign
	// 文本消息
	var content = params['content'];
	console.log("send_message_url", callback_url);
	// 发送消息
	tool_util.post(callback_url, content, function(err, result) {
		console.log("send_message_res", result);
		res.send(200, result);
	});
});

module.exports = router;
