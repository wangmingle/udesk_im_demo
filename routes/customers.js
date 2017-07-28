var express = require('express');
var router = express.Router();
var config = require('../config');
var _ = require('underscore');
var UUID = require('uuid');
var sha1 = require('node-sha1');

/**
 * 客户身份认证
 * @param 
 * @return 
 */
router.get('/', function(req, res, next) {
	web_token = UUID.v1();
	nonce = UUID.v4();
	timestamp =  new Date().getTime();
	sign_str = "nonce=" + nonce + "&timestamp=" + timestamp + "&web_token=" + web_token + "&" + config['im_user_key']
	signature = sha1(sign_str).toUpperCase();
	var company_res = {
		web_token: web_token,
		nonce: nonce,
		timestamp: timestamp,
		signature: signature,
	}
	company_res = _.extend(company_res, config)
	console.log("res", company_res)
  res.render('customers', {company_res: company_res});
});

module.exports = router;
