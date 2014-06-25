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
	"dojo/dom",
	"dojo/dom-style",
	"dojo/query"
], function (declare, dom, domStyle, query) {
	return declare(null, {

		config:{},

		constructor:function (templateConfig) {
			//console.debug("uiUtils", templateConfig);
			this.config = templateConfig;
		},

		loadAppStyles:function () {
			this._setAppHeaderStyle(this.config.APP_HEADER_TEXT_COLOR, this.config.APP_HEADER_BACKGROUND_COLOR);
			this._setAppHeaderTitle(this.config.APP_HEADER_TEXT);
			this._setAppHeaderSubtitle(this.config.APP_SUBHEADER_TEXT);
			this._setAppMessage(".step-one-message", this.config.STEP_ONE_MESSAGE);
			this._setAppMessage(".step-one-half-circle-msg", this.config.STEP_ONE_HALF_CIRCLE_MSG);
			this._setAppMessage(".step-two-message", this.config.STEP_TWO_MESSAGE);
			this._setAppMessage(".step-two-half-circle-msg", this.config.STEP_TWO_HALF_CIRCLE_MSG);
			this._setAppMessage(".step-three-message", this.config.STEP_THREE_MESSAGE);
			this._setAppMessage(".step-three-half-circle-msg", this.config.STEP_THREE_HALF_CIRCLE_MSG);
			this._setHalfCircleStyle(this.config.HALF_CIRCLE_BACKGROUND_COLOR, this.config.HALF_CIRCLE_COLOR, this.config.HALF_CIRCLE_OPACITY);
			this._setTimelineLegendHeaderTitle(this.config.TIMELINE_LEGEND_HEADER);
			this._setTimelineContainerStyle(this.config.TIMELINE_CONTAINER_BACKGROUND_COLOR);
		},

		_setAppHeaderStyle:function (txtColor, backgroundColor) {
			query(".header").style("color", txtColor);
			query(".header").style("background-color", backgroundColor);
		},

		_setAppHeaderTitle:function (str) {
			query(".header-title")[0].innerHTML = str;
		},

		_setAppHeaderSubtitle:function (str) {
			query(".subheader-title")[0].innerHTML = str;
		},

		_setAppMessage:function (node, str) {
			query(node)[0].innerHTML = str;
		},

		_setTimelineLegendHeaderTitle:function (str) {
			query(".timeline-legend-header")[0].innerHTML = str;
		},

		_setHalfCircleStyle:function (backgroundColor, color, opacity) {
			query(".halfCircleRight").style("backgroundColor", backgroundColor);
			query(".halfCircleRight").style("color", color);
			query(".halfCircleRight").style("opacity", opacity);
		},

		_setTimelineContainerStyle:function (backgroundColor) {
			domStyle.set(dom.byId("timeline-container"), "backgroundColor", backgroundColor);
		},

		hideStep: function (stepName, stepMessage) {
			if (stepName)
				query("" + stepName).style("display", "none");
			if (stepMessage)
				query("" + stepMessage).style("display", "none");
		},

		showStep: function (stepName, stepMessage) {
			if (stepName)
				query("" + stepName).style("display", "block");
			if (stepMessage)
				query("" + stepMessage).style("display", "block");
		},
	});
});
