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
	"dojo/dom",
	"dojo/dom-attr",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dojo/query",
	"esri/graphic"
], function (declare, lang, dom, domAttr, domConstruct, domStyle, query, Graphic) {
	return declare(null, {

		config: {},

		constructor: function (templateConfig) {
			this.config = templateConfig;
		},

		mapClickHandler: function (evt) {
			this.currentMapClickPoint = evt.mapPoint;
			this.currentLOD = this.map.getLevel();
			if (this.crosshairGraphic) {
				this.map.graphics.remove(this.crosshairGraphic);
			}
			this.crosshairGraphic = new Graphic(this.currentMapClickPoint, this.crosshairSymbol);
			this.map.graphics.add(this.crosshairGraphic);
			this.runQuery(this.currentMapExtent, this.currentMapClickPoint, this.currentLOD);
		},

		mapExtentChangeHandler: function (evt) {
			this.currentMapExtent = evt.extent;
			this.currentLOD = evt.lod.level;
			query(".dgrid-row").forEach(lang.hitch(this, function (node) {
				var row = this.grid.row(node),
					lodThreshold = row.data.lodThreshold,
					maskId = domAttr.get(node, "id") + "-mask";
				if (this.currentLOD <= lodThreshold) {
					// disable row
					if (dom.byId(maskId) === null) {
						domConstruct.create("div", {
							id: maskId,
							"class": "grid-map",
							innerHTML: "<p style='text-align: center; margin-top: 20px'>" + this.config.THUMBNAIL_VISIBLE_THRESHOLD_MSG + "</p>"
						}, node, "first");
					}
				} else {
					// enable row
					domConstruct.destroy(maskId);
				}
			}));
		},

		updateStartHandler: function () {
			esri.show(this._loading);
			this.map.disableMapNavigation();
		},

		updateEndHandler: function () {
			esri.hide(this._loading);
			this.map.enableMapNavigation();
		}
	});
});
