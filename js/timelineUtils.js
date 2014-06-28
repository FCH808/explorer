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
	"dojo/_base/declare"
], function (declare) {
	return declare(null, {

		config: {},

		constructor: function (templateConfig) {
			this.config = templateConfig;
		},

		formatDay:function (date) {
			if (date instanceof Date) {
				return date.getDate();
			} else {
				return "";
			}
		},

		formatMonth:function (date) {
			if (date instanceof Date) {
				var month = date.getMonth();
				if (month === 0) {
					return "01";
				} else if (month === 1) {
					return "02";
				} else if (month === 2) {
					return "03";
				} else if (month === 3) {
					return "04";
				} else if (month === 4) {
					return "05";
				} else if (month === 5) {
					return "06";
				} else if (month === 6) {
					return "07";
				} else if (month === 7) {
					return "08";
				} else if (month === 8) {
					return "09";
				} else if (month === 9) {
					return "10";
				} else if (month === 10) {
					return "11";
				} else if (month === 11) {
					return "12";
				}
			} else {
				return "";
			}
		},

		formatYear:function (date) {
			if (date instanceof Date) {
				return date.getFullYear();
			} else {
				return "";
			}
		}
	});
});
