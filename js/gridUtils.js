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
	"dojo/_base/lang",
	"dojo/dom-construct",
	"esri/Color",
	"esri/graphic"
], function (array, declare, lang, domConstruct, Color, Graphic) {
	return declare(null, {

		config: {},

		constructor: function (templateConfig) {
			this.config = templateConfig;
		},

		gridRefreshHandler: function (evt) {
			array.forEach(evt.grid.store.data, function (node) {
				var row = evt.grid.row(node),
					lodThreshold = row.data.lodThreshold,
					maskId = "grid-row-" + row.data.objID + "-mask";
				if (this.currentLOD <= lodThreshold) {
					domConstruct.create("div", {
						id: maskId,
						"class": "grid-map",
						innerHTML: "<p style='text-align: center; margin-top: 20px'>" + this.config.THUMBNAIL_VISIBLE_THRESHOLD_MSG + "</p>"
					}, row.element, "first");
				}
			});
		},

		gridDataChangeHandler: function (evt) {
			var diff = 1 - evt.value;
			evt.cell.row.data.layer.setOpacity(diff);
		},

		gridEnterCellHandler: function (evt) {
			console.log(evt);
			if (this.mouseOverGraphic) {
				this.map.graphics.remove(this.mouseOverGraphic);
			}
			var row = evt.grid.row(evt),
				extent = row.data.extent,
				sfs = this.createMouseOverGraphic(
					new Color(this.config.SIDEBAR_MAP_MOUSEOVER_GR_BORDER),
					new Color(this.config.SIDEBAR_MAP_MOUSEOVER_GR_FILL)
				);
			this.mouseOverGraphic = new Graphic(extent, sfs);
			this.map.graphics.add(this.mouseOverGraphic);
		}
	});
});
