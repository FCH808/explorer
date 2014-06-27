/*
 | Copyright 2014 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */
define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/query"
], function (declare, lang, query) {
	return declare(null, {

		config:{},

		constructor:function (templateConfig) {
			this.config = templateConfig;
		},

		documentClickHandler: function (evt) {
			if (!$("#bitlyIcon").is(evt.target) && !$("#bitlyInput").is(evt.target) && !$(".popover-content").is(evt.target)) {
				$(".popover").hide();
			}
		},

		requestBitly: function () {
			var url = this._setSharingUrl(),
				bitlyUrls = [
					"http://api.bitly.com/v3/shorten?callback=?",
					"https://api-ssl.bitly.com/v3/shorten?callback=?"
				],
				bitlyUrl = location.protocol === 'http:' ? bitlyUrls[0] : bitlyUrls[1],
				urlParams = esri.urlToObject(url).query || {},
				targetUrl = url;

			$.getJSON(
					bitlyUrl,
					{
						"format":"json",
						"apiKey":"R_14fc9f92e48f7c78c21db32bd01f7014",
						"login":"esristorymaps",
						"longUrl":targetUrl
					},
					function (response) {
						if (!response || !response || !response.data.url)
							return;
						$("#bitlyLoad").fadeOut();
						$("#bitlyInput").fadeIn();
						$("#bitlyInput").val(response.data.url);
						$("#bitlyInput").select();
					}
			);
			$(".popover").show();
		},

		shareFacebook: function () {
			var url = this._setSharingUrl(),
				options = '&p[title]=' + encodeURIComponent($('#title').text())
					+ '&p[summary]=' + encodeURIComponent($('#subtitle').text())
					+ '&p[url]=' + encodeURIComponent(url)
					+ '&p[images][0]=' + encodeURIComponent($("meta[property='og:image']").attr("content"));

			window.open('http://www.facebook.com/sharer.php?s=100' + options, 'Facebook sharing', 'toolbar=0,status=0,width=626,height=436');
		},

		shareTwitter: function () {
			var url = this._setSharingUrl(),
				bitlyUrls = [
					"http://api.bitly.com/v3/shorten?callback=?",
					"https://api-ssl.bitly.com/v3/shorten?callback=?"
				],
				bitlyUrl = location.protocol === 'http:' ? bitlyUrls[0] : bitlyUrls[1],
				urlParams = esri.urlToObject(url).query || {},
				targetUrl = url;

			$.getJSON(
					bitlyUrl,
					{
						"format":"json",
						"apiKey":"R_14fc9f92e48f7c78c21db32bd01f7014",
						"login":"esristorymaps",
						"longUrl":targetUrl
					},
					function (response) {
						if (!response || !response || !response.data.url)
							return;
					}
			).complete(function (response) {
						options = 'text=' + encodeURIComponent($('#title').text()) +
								'&url=' + encodeURIComponent(response.responseJSON.data.url) +
								'&related=' + this.config.SHARING_RELATED +
								'&hashtags=' + this.config.SHARING_HASHTAG;
						window.open('https://twitter.com/intent/tweet?' + options, 'Tweet', 'toolbar=0,status=0,width=626,height=436');
					});
			window.open('https://twitter.com/intent/tweet?' + options, 'Tweet', 'toolbar=0,status=0,width=626,height=436');
		}
	});
});
