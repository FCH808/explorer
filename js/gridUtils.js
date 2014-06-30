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

		/**
		 * Fires any time a refresh call completes successfully.
		 *
		 * @param evt
		 */
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

		/**
		 * Editor module when an editor field loses focus after being changed (handle the HSlider)
		 *
		 * @param evt
		 */
		gridDataChangeHandler: function (evt) {
			var diff = 1 - evt.value;
			evt.cell.row.data.layer.setOpacity(diff);
		},

		/**
		 * Fires when the mouse moves into a cell within the body of a grid.
		 *
		 * @param evt
		 */
		gridEnterCellHandler: function (evt) {
			if (this.mouseOverGraphic) {
				this.map.graphics.remove(this.mouseOverGraphic);
			}
			var row = this.grid.row(evt),
				extent = row.data.extent,
				sfs = this._createMouseOverGraphic(
					new Color(this.config.SIDEBAR_MAP_MOUSEOVER_GR_BORDER),
					new Color(this.config.SIDEBAR_MAP_MOUSEOVER_GR_FILL)
				);
			this.mouseOverGraphic = new Graphic(extent, sfs);
			this.map.graphics.add(this.mouseOverGraphic);
		},

		/**
		 * Fires when the mouse moves out of a cell within the body of a grid.
		 *
		 * @param evt
		 */
		gridLeaveCellHandler: function (evt) {
			this.map.graphics.remove(this.mouseOverGraphic);
			this.map.graphics.clear();
			this.userInterfaceUtils.addCrosshair(this.currentMapClickPoint);
		},

		thumbnailRenderCell: function (object, data, td, options) {
			var objID = object.objID,
				mapName = object.name,
				imprintYear = object.imprintYear,
				downloadLink = object.downloadLink,
				imgSrc = this.config.IMAGE_SERVER + "/" + objID + this.config.INFO_THUMBNAIL,
				node = domConstruct.create("div", {
					"class": "renderedCell",
					"innerHTML": "<button class='rm-layer-btn' data-objectid='" + objID + "'> X </button>" +
						"<img class='rm-layer-icon' src='" + imgSrc + "'>" +
						"<div class='thumbnailMapName'>" + mapName + "</div>" +
						"<div class='thumbnailMapImprintYear'>" + imprintYear + "</div>" +
						"<div class='downloadLink'><a href='" + downloadLink + "' target='_parent'>download map</a></div>",
					onclick: lang.hitch(this, function (evt) {
						var objID = evt.target.getAttribute("data-objectid"),
							storeObj = this.store.query({
								objID: objID
							});
						// remove the layer
						this.map.removeLayer(storeObj[0].layer);
						// update the store
						this.store.remove(parseInt(objID));
						// update the UI
						if (this.store.data.length < 1) {
							// no remaining items in the grid/store
							this.map.graphics.remove(this.mouseOverGraphic);
							this.map.graphics.clear();
							this.userInterfaceUtils.addCrosshair(this.currentMapClickPoint);
							this.hideLoadingIndicator();
							this.userInterfaceUtils.hideStep(".stepThree", ".step-three-message");
							this.userInterfaceUtils.showStep(".stepTwo", ".step-two-message");
						}
					})
				});
			return node;
		}
	});
});
