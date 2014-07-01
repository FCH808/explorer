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
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/aspect",
	"dojo/dom",
	"dojo/dom-attr",
	"dojo/dom-construct",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"dojo/query",
	"esri/graphic",
	"esri/symbols/SimpleFillSymbol",
	"esri/symbols/SimpleLineSymbol",
	"esri/symbols/SimpleMarkerSymbol",
	"esri/Color"
], function (array, declare, aspect, dom, domAttr, domConstruct, domGeom, domStyle, query, Graphic, SimpleFillSymbol, SimpleLineSymbol, SimpleMarkerSymbol, Color) {
	return declare(null, {

		config: {},
		_main: {},
		_crosshairGraphic: "",
		_crosshairSymbol: "",

		constructor: function (obj, templateConfig) {
			this._main = obj;
			this.config = templateConfig;
			this._crosshairSymbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CROSS, this.config.CROSSHAIR_SIZE, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color(this.config.CROSSHAIR_FILL_COLOR), this.config.CROSSHAIR_OPACITY));
		},

		/**
		 * Load the app's styles
		 */
		loadAppStyles: function () {
			document.title = this.config.APP_TITLE;
			this._setAppHeaderStyle(this.config.APP_HEADER_TEXT_COLOR, this.config.APP_HEADER_BACKGROUND_COLOR);
			this._setAppHeaderTitle(this.config.APP_HEADER_TEXT);
			this._setAppHeaderSubtitle(this.config.APP_SUBHEADER_TEXT);
			domAttr.set("esri-logo", "src", this.config.ESRI_ICON_PATH);
			domAttr.set("non-esri-logo", "src", this.config.NON_ESRI_ICON_PATH);
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

		_setAppHeaderStyle: function (txtColor, backgroundColor) {
			query(".header").style("color", txtColor);
			query(".header").style("background-color", backgroundColor);
		},

		_setAppHeaderTitle: function (str) {
			query(".header-title")[0].innerHTML = str;
		},

		_setAppHeaderSubtitle: function (str) {
			query(".subheader-title")[0].innerHTML = str;
		},

		_setAppMessage: function (node, str) {
			query(node)[0].innerHTML = str;
		},

		_setTimelineLegendHeaderTitle: function (str) {
			query(".timeline-legend-header")[0].innerHTML = str;
		},

		_setHalfCircleStyle: function (backgroundColor, color, opacity) {
			query(".halfCircleRight").style("backgroundColor", backgroundColor);
			query(".halfCircleRight").style("color", color);
			query(".halfCircleRight").style("opacity", opacity);
		},

		_setTimelineContainerStyle: function (backgroundColor) {
			domStyle.set(dom.byId("timeline-container"), "backgroundColor", backgroundColor);
		},

		hideStep: function (stepName, stepMessage) {
			if (stepName)
				query(stepName).style("display", "none");
			if (stepMessage)
				query(stepMessage).style("display", "none");
		},

		showStep: function (stepName, stepMessage) {
			if (stepName)
				query(stepName).style("display", "block");
			if (stepMessage)
				query(stepMessage).style("display", "block");
		},

		showGrid: function () {
			query(".gridContainer").style("display", "block");
			this.hideStep(".stepTwo", ".step-two-message");
		},

		addCrosshair: function (mp) {
			if (this._crosshairGraphic) {
				this._main.map.graphics.remove(this._crosshairGraphic);
			}
			this._crosshairGraphic = new Graphic(mp, this._crosshairSymbol);
			this._main.map.graphics.add(this._crosshairGraphic);
		},

		addNoResultsMask: function () {
			domConstruct.create("div", {
				"class": "timeline-mask",
				"innerHTML": "<p style='text-align: center; margin-top: 20px'>" + this.config.MSG_NO_MAPS + "</p>"
			}, "timeline", "first");
		},

		createMouseOverGraphic: function (borderColor, fillColor) {
			var sfs = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
					new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, borderColor, this.config.IMAGE_BORDER_WIDTH), fillColor);
			return sfs;
		},

		watchSplitters: function (bc) {
			array.forEach(["bottom"], function (region) {
				var spl = bc.getSplitter(region);
				aspect.after(spl, "_startDrag", function () {
					domStyle.set(spl.child.domNode, "opacity", "0.4");
				});
				aspect.after(spl, "_stopDrag", function () {
					domStyle.set(spl.child.domNode, "opacity", "1.0");
					// TODO Timeline height needs to be resized accordingly
					var node = dom.byId("timeline-container");
					this.timelineContainerNodeGeom = domStyle.getComputedStyle(this.timelineContainerNode);
					this.timelineContainerGeometry = domGeom.getContentBox(node, this.timelineContainerNodeGeom);
					this.timelineUtils.drawTimeline(this.timelineData);
				});
			});
		}
	});
});
