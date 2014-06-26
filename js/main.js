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
	"dojo/ready",
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/fx",
	"dojo/_base/lang",
	"dojo/Deferred",
	"dojo/aspect",
	"dojo/dom",
	"dojo/dom-attr",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"dojo/io-query",
	"dojo/json",
	"dojo/mouse",
	"dojo/number",
	"dojo/on",
	"dojo/parser",
	"dojo/promise/all",
	"dojo/query",
	"dojo/topic",
	"dojo/store/Observable",
	"dojo/store/Memory",
	"dgrid/extensions/DnD",
	"dgrid/OnDemandGrid",
	"dgrid/editor",
	"dgrid/Selection",
	"dgrid/Keyboard",
	"dgrid/util/mouse",
	"dijit/form/Button",
	"dijit/form/HorizontalSlider",
	"dijit/layout/BorderContainer",
	"dijit/layout/ContentPane",
	"dijit/registry",
	"esri/arcgis/utils",
	"esri/dijit/Geocoder",
	"esri/geometry/Extent",
	"esri/geometry/Point",
	"esri/SpatialReference",
	"esri/graphic",
	"esri/layers/ArcGISDynamicMapServiceLayer",
	"esri/layers/ArcGISImageServiceLayer",
	"esri/layers/ImageServiceParameters",
	"esri/layers/MosaicRule",
	"esri/map",
	"esri/symbols/SimpleFillSymbol",
	"esri/symbols/SimpleLineSymbol",
	"esri/symbols/SimpleMarkerSymbol",
	"esri/Color",
	"esri/tasks/query",
	"esri/tasks/QueryTask",
	"esri/urlUtils",
	"application/uiUtils",
	"application/timelineLegendUtils"
], function (ready, array, declare, fx, lang, Deferred, aspect, dom, domAttr, domClass, domConstruct, domGeom, domStyle, ioQuery, json, mouse, number, on, parser, all, query, topic, Observable, Memory, DnD, OnDemandGrid, editor, Selection, Keyboard, mouseUtil, Button, HorizontalSlider, BorderContainer, ContentPane, registry, arcgisUtils, Geocoder, Extent, Point, SpatialReference, Graphic, ArcGISDynamicMapServiceLayer, ArcGISImageServiceLayer, ImageServiceParameters, MosaicRule, Map, SimpleFillSymbol, SimpleLineSymbol, SimpleMarkerSymbol, Color, Query, QueryTask, urlUtils, UserInterfaceUtils, TimelineLegendUtils) {
	return declare(null, {

		OUTFIELDS:"",
		TOKEN:"",
		IMAGE_SERVICE_URL:"",
		imageServiceLayer:"",
		DOWNLOAD_PATH:"",
		TOPO_MAP_SCALES:"",
		mapScaleValues:[],

		nScales:"",
		maxScaleValue:"",
		minScaleValue:"",

		_loading:"",
		urlQueryObject:"",

		currentLOD:"",
		currentMapClickPoint:"",
		currentMapExtent:"",

		crosshairGraphic:"",
		crosshairSymbol:"",

		data:"",
		grid:"",
		store:"",
		storeData:[],

		timelineContainerNode:"",
		timeline:"",
		timelineOptions:"",
		timelineContainerNodeGeom:"",
		timelineContainerGeometry:"",
		timelineData:[],

		mouseOverGraphic:"",
		filterSelection:[],
		filter:[],
		filteredData:"",

		userInterfaceUtils:{},
		sharingUrl:"",

		minimumId:"",

		config:{},

		startup:function (config) {
			// config will contain application and user defined info for the template such as i18n strings, the web map id
			// and application id
			// any url parameters and any application specific configuration information.
			if (config) {
				this.config = config;
				// document ready
				ready(lang.hitch(this, function () {

					this.userInterfaceUtils = new UserInterfaceUtils(this.config);
					var timelineLegendUtils = new TimelineLegendUtils(this.config);

					//supply either the webmap id or, if available, the item info
					var itemInfo = this.config.itemInfo || this.config.webmap;
					this._createWebMap(itemInfo);

					document.title = this.config.APP_TITLE;
					this.OUTFIELDS = this.config.OUTFIELDS;
					this.TOKEN = this.config.TOKEN;
					this.IMAGE_SERVICE_URL = this.config.IMAGE_SERVER + this.config.IMAGE_SERVER_JSON + this.TOKEN;
					this.TOPO_MAP_SCALES = this.config.TIMELINE_LEGEND_VALUES;
					this.DOWNLOAD_PATH = this.config.DOWNLOAD_PATH;

					for (var i = 0; i < this.TOPO_MAP_SCALES.length; i++) {
						this.mapScaleValues.push(this.TOPO_MAP_SCALES[i].value);
					}

					this.crosshairSymbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CROSS, this.config.CROSSHAIR_SIZE, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color(this.config.CROSSHAIR_FILL_COLOR), this.config.CROSSHAIR_OPACITY));

					this.nScales = timelineLegendUtils.getNumberOfScales(this.TOPO_MAP_SCALES);
					this.maxScaleValue = timelineLegendUtils.getMaxScaleValue(this.TOPO_MAP_SCALES);
					this.minScaleValue = timelineLegendUtils.getMinScaleValue(this.TOPO_MAP_SCALES);

					this.userInterfaceUtils.loadAppStyles();

					this._loading = dom.byId("loadingImg");
					this.urlQueryObject = this.getUrlParameters();
					//initBaseMap(urlQueryObject);

					var columns = [
						{
							label:" ",
							field:"objID",
							hidden:true
						},
						{
							label:" ",
							field:"name",
							renderCell:lang.hitch(this, "thumbnailRenderCell")
						},
						editor({
							label:" ",
							field:"transparency",
							editorArgs:{
								value:0,
								minimum:0,
								maximum:1.0,
								intermediateChanges:true
							}
						}, HorizontalSlider)
					];

					this.grid = new (declare([OnDemandGrid, Selection, DnD, Keyboard]))({
						store:this.store = this.createOrderedStore(this.storeData, {
							idProperty:"objID"
						}),
						idProperty:"objID",
						columns:columns,
						showHeader:false,
						selectionMode:"single",
						dndParams:{
							singular:true
						},
						getObjectDndType:function (item) {
							return [item.type ? item.type : this.dndSourceType];
						}
					}, "grid");

					this.grid.on("dgrid-datachange", lang.hitch(this, "gridDataChangeHandler"));
					this.grid.on("dgrid-refresh-complete", lang.hitch(this, "gridRefreshHandler"));
					this.grid.on(mouseUtil.enterCell, lang.hitch(this, "gridEnterCellHandler"));
					this.grid.on(mouseUtil.leaveCell, lang.hitch(this, "gridLeaveCellHandler"));

					// timeline options
					this.timelineOptions = {
						"width":"100%",
						"height":this.config.TIMELINE_HEIGHT + "px",
						"style":this.config.TIMELINE_STYLE,
						"showNavigation":this.config.TIMELINE_SHOW_NAVIGATION,
						"max":new Date(this.config.TIMELINE_MAX_DATE, 0, 0),
						"min":new Date(this.config.TIMELINE_MIN_DATE, 0, 0),
						"scale":links.Timeline.StepDate.SCALE.YEAR,
						"step":this.config.TIMELINE_STEP,
						"stackEvents":true,
						"zoomMax":this.config.TIMELINE_ZOOM_MAX,
						"zoomMin":this.config.TIMELINE_ZOOM_MIN,
						"cluster":this.config.TIMELINE_CLUSTER,
						"animate":this.config.TIMELINE_ANIMATE
					};
					array.forEach(this.config.TIMELINE_LEGEND_VALUES, lang.hitch(this, "buildLegend"));

					this.watchSplitters(registry.byId("main-window"));

					this.timelineContainerNode = dom.byId("timeline-container");
					//initUrlParamData(urlQueryObject);
				}));
			} else {
				var error = new Error("Main:: Config is not defined");
				this.reportError(error);
			}
		},

		reportError:function (error) {
			// remove loading class from body
			domClass.remove(document.body, "app-loading");
			domClass.add(document.body, "app-error");
			// an error occurred - notify the user. In this example we pull the string from the
			// resource.js file located in the nls folder because we've set the application up
			// for localization. If you don't need to support multiple languages you can hardcode the
			// strings here and comment out the call in index.html to get the localization strings.
			// set message
			var node = dom.byId("loading_message");
			if (node) {
				if (this.config && this.config.i18n) {
					node.innerHTML = this.config.i18n.map.error + ": " + error.message;
				} else {
					node.innerHTML = "Unable to create map: " + error.message;
				}
			}
		},

		// create a map based on the input web map id
		_createWebMap:function (itemInfo) {
			var lat, lng, lod;

			if (this.urlQueryObject) {
				lat = this.urlQueryObject.lat;
				lng = this.urlQueryObject.lng;
				lod = this.urlQueryObject.zl;
			} else {
				lat = this.config.BASEMAP_INIT_LAT;
				lng = this.config.BASEMAP_INIT_LNG;
				lod = this.config.BASEMAP_INIT_ZOOM;
			}

			arcgisUtils.createMap(itemInfo, "mapDiv", {
				mapOptions:{
					// Optionally define additional map config here for example you can
					// turn the slider off, display info windows, disable wraparound 180, slider position and more.
					center:[lng, lat],
					zoom:lod
				},
				bingMapsKey:this.config.bingKey
			}).then(lang.hitch(this, function (response) {
				// Once the map is created we get access to the response which provides important info
				// such as the map, operational layers, popup info and more. This object will also contain
				// any custom options you defined for the template. In this example that is the 'theme' property.
				// Here' we'll use it to update the application to match the specified color theme.
				// console.log(this.config);
				this.map = response.map;
				// make sure map is loaded
				if (this.map.loaded) {
					// do something with the map
					this._mapLoaded();
				} else {
					on.once(this.map, "load", lang.hitch(this, function () {
						// do something with the map
						this._mapLoaded();
					}));
				}
			}), this.reportError);
		},

		// Map is ready
		_mapLoaded:function () {
			// remove loading class from body
			domClass.remove(document.body, "app-loading");

			if (this.urlQueryObject !== null) {
				var _mp = new Point([this.urlQueryObject.clickLat, this.urlQueryObject.clickLng], new SpatialReference({ wkid:102100 }));
				// add crosshair
				this.addCrosshair(_mp);
			}

			//// external logic ////
			// Load the Geocoder Dijit
			this._initGeocoderDijit("geocoder");

			on(this.map, "click", lang.hitch(this, "_mapClickHandler"));
			on(this.map, "extent-change", lang.hitch(this, "_mapExtentChangeHandler"));
			on(this.map, "update-start", lang.hitch(this, "_updateStartHandler"));
			on(this.map, "update-end", lang.hitch(this, "_updateEndHandler"));
			on(document, ".share_facebook:click", lang.hitch(this, "shareFacebook"));
			on(document, ".share_twitter:click", lang.hitch(this, "shareTwitter"));
			on(document, ".share_bitly:click", lang.hitch(this, "requestBitly"));
			on(document, "click", lang.hitch(this, "documentClickHandler"));
		},

		getUrlParameters:function () {
			var urlObject = urlUtils.urlToObject(window.location.href);
			return urlObject.query;
		},

		watchSplitters:function (bc) {
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
					this.drawTimeline(this.timelineData);
				});
			});
		},

		gridRefreshHandler:function (evt) {
			array.forEach(evt.grid.store.data, lang.hitch(this, function (node) {
				var row = this.grid.row(node);
				var lodThreshold = row.data.lodThreshold;
				var maskId = "grid-row-" + row.data.objID + "-mask";
				if (this.currentLOD <= lodThreshold) {
					domConstruct.create("div", {
						id:"" + maskId,
						"class":"grid-map",
						innerHTML:"<p style='text-align: center; margin-top: 20px'>" + this.config.THUMBNAIL_VISIBLE_THRESHOLD_MSG + "</p>"
					}, row.element, "first");
				}
			}));
		},

		gridEnterCellHandler:function (evt) {
			if (this.mouseOverGraphic)
				this.map.graphics.remove(this.mouseOverGraphic);
			var row = this.grid.row(evt);
			var extent = row.data.extent;
			var sfs = this.createMouseOverGraphic(
					new Color(this.config.SIDEBAR_MAP_MOUSEOVER_GR_BORDER),
					new Color(this.config.SIDEBAR_MAP_MOUSEOVER_GR_FILL));
			this.mouseOverGraphic = new Graphic(extent, sfs);
			this.map.graphics.add(this.mouseOverGraphic);
		},

		gridLeaveCellHandler:function (evt) {
			this.map.graphics.remove(this.mouseOverGraphic);
			this.map.graphics.clear();
			this.addCrosshair(this.currentMapClickPoint);
		},

		createMouseOverGraphic:function (borderColor, fillColor) {
			var sfs = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
					new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, borderColor, this.config.IMAGE_BORDER_WIDTH), fillColor);
			return sfs;
		},

		gridDataChangeHandler:function (evt) {
			var diff = 1 - evt.value;
			evt.cell.row.data.layer.setOpacity(diff);
		},

		_mapClickHandler:function (evt) {
			this.currentMapClickPoint = evt.mapPoint;
			this.currentLOD = this.map.getLevel();
			if (this.crosshairGraphic) {
				this.map.graphics.remove(this.crosshairGraphic);
			}
			this.crosshairGraphic = new Graphic(this.currentMapClickPoint, this.crosshairSymbol);
			this.map.graphics.add(this.crosshairGraphic);
			this.runQuery(this.currentMapExtent, this.currentMapClickPoint, this.currentLOD);
		},

		_mapExtentChangeHandler:function (evt) {
			this.currentMapExtent = evt.extent;
			this.currentLOD = evt.lod.level;
			query(".dgrid-row").forEach(lang.hitch(this, function (node) {
				var row = this.grid.row(node);
				var lodThreshold = row.data.lodThreshold;
				var maskId = domAttr.get(node, "id") + "-mask";
				if (this.currentLOD <= lodThreshold) {
					// disable row
					if (dom.byId("" + maskId) === null) {
						domConstruct.create("div", {
							id:"" + maskId,
							"class":"grid-map",
							innerHTML:"<p style='text-align: center; margin-top: 20px'>" + this.config.THUMBNAIL_VISIBLE_THRESHOLD_MSG + "</p>"
						}, node, "first");
					}
				} else {
					// enable row
					domConstruct.destroy("" + maskId);
				}
			}));
		},

		_updateStartHandler:function () {
			esri.show(this._loading);
			this.map.disableMapNavigation();
		},

		_updateEndHandler:function () {
			esri.hide(this._loading);
			this.map.enableMapNavigation();
		},

		_initGeocoderDijit:function (srcRef) {
			var geocoder = new Geocoder({
				map:this.map,
				autoComplete:true,
				showResults:true,
				searchDelay:250,
				arcgisGeocoder:{
					placeholder:"Find a place"
				}
			}, srcRef);
			geocoder.startup();
		},

		buildLegend:function (legendItem) {
			var node = domConstruct.toDom('<label data-scale="' + legendItem.value + '" data-placement="right" class="btn toggle-scale active" style="background-color: ' + legendItem.color + '">' +
					'<input type="checkbox" name="options"><span data-scale="' + legendItem.value + '">' + legendItem.label + '</span>' +
					'</label>');

			if (this.urlQueryObject) {
				var _tmpFilters = this.urlQueryObject.f.split("|");
				var num = number.format(legendItem.value, {
					places:0,
					pattern:"#"
				});
				var i = _tmpFilters.indexOf(num);
				if (_tmpFilters[i] !== undefined) {
					domClass.toggle(node, "sel");
					domStyle.set(node, "opacity", "0.3");
					this.filter.push(_tmpFilters[i]);
				}
			}

			on(node, "click", lang.hitch(this, function (evt) {
				var selectedScale = evt.target.getAttribute("data-scale");
				domClass.toggle(node, "sel");
				if (domClass.contains(node, "sel")) {
					var j = this.filter.indexOf(selectedScale);
					if (j === -1) {
						this.filter.push(selectedScale);
					}
					domStyle.set(node, "opacity", "0.3");
					this.filterSelection.push(selectedScale);
				} else {
					var k = this.filter.indexOf(selectedScale);
					if (k !== -1) {
						this.filter.splice(k, 1);
					}
					domStyle.set(node, "opacity", "1.0");
					var i = this.filterSelection.indexOf(selectedScale);
					if (i !== -1) {
						this.filterSelection.splice(i, 1);
					}
				}
				this.drawTimeline(this.timelineData);
			}));
			domConstruct.place(node, query(".topo-legend")[0]);
		},

		thumbnailRenderCell:function (object, data, td, options) {
			var objID = object.objID;
			var mapName = object.name;
			var imprintYear = object.imprintYear;
			var downloadLink = object.downloadLink;
			var imgSrc = this.config.IMAGE_SERVER + "/" + objID + this.config.INFO_THUMBNAIL + this.config.INFO_THUMBNAIL_TOKEN;

			var node = domConstruct.create("div", {
				"class":"renderedCell",
				"innerHTML":"<button class='rm-layer-btn' data-objectid='" + objID + "'> X </button>" +
						"<img class='rm-layer-icon' src='" + imgSrc + "'>" +
						"<div class='thumbnailMapName'>" + mapName + "</div>" +
						"<div class='thumbnailMapImprintYear'>" + imprintYear + "</div>" +
						"<div class='downloadLink'><a href='" + downloadLink + "' target='_parent'>download map</a></div>",
				onclick:lang.hitch(this, function (evt) {
					var objID = evt.target.getAttribute("data-objectid");
					var storeObj = this.store.query({
						objID:objID
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
						this.addCrosshair(this.currentMapClickPoint);
						this.hideLoadingIndicator();
						this.userInterfaceUtils.hideStep(".stepThree", ".step-three-message");
						this.userInterfaceUtils.showStep(".stepTwo", ".step-two-message");
					}
				})
			});
			return node;
		},

		addCrosshair:function (mp) {
			if (this.crosshairGraphic) {
				this.map.graphics.remove(this.crosshairGraphic);
			}
			this.crosshairGraphic = new Graphic(mp, this.crosshairSymbol);
			this.map.graphics.add(this.crosshairGraphic);
		},

		// dojo src
		createOrderedStore:function (data, options) {
			var opts = options;
			// Instantiate a Memory store modified to support ordering.
			return Observable(new Memory(lang.mixin({
				data:data,
				idProperty:"id",
				put:lang.hitch(this, function (object, opts) {
					var storeRef = this.store;
					var _calc = lang.hitch(this, function () {
						return this.calculateOrder(storeRef, object, opts && opts.before);
					});
					object.id = _calc();
					return Memory.prototype.put.call(storeRef, object, opts);
				}),
				// Memory's add does not need to be augmented since it calls put
				copy:function (object, options) {
					// summary:
					//		Given an item already in the store, creates a copy of it.
					//		(i.e., shallow-clones the item sans id, then calls add)
					var k, obj = {}, id, idprop = this.idProperty, i = 0;
					for (k in object) {
						obj[k] = object[k];
					}
					// Ensure unique ID.
					// NOTE: this works for this example (where id's are strings);
					// Memory should autogenerate random numeric IDs, but
					// something seems to be falling through the cracks currently...
					id = object[idprop];
					if (id in this.index) {
						// rev id
						while (this.index[id + "(" + (++i) + ")"]) {
						}
						obj[idprop] = id + "(" + i + ")";
					}
					this.add(obj, options);
				},
				query:function (query, options) {
					options = options || {};
					options.sort = [
						{
							attribute:"id"
						}
					];
					return Memory.prototype.query.call(this, query, options);
				}
			}, options)));
		},

		//calculateOrder:function (store, object, options) {
		calculateOrder:function (store, object, before, orderField) {
			// Calculates proper value of order for an item to be placed before another
			var afterOrder,
					beforeOrder = 0;
			if (!orderField) {
				orderField = "id";
			}

			if (store.data.length > 0) {
				// calculate midpoint between two items' orders to fit this one
				// afterOrder = before[orderField];
				var tmp = store.query({
					"objID":query(".dgrid-row", grid.domNode)[0].id.split("-")[2]
				});
				afterOrder = tmp[0].id;
				//afterOrder = store.data[store.data.length - 1].id;
				store.query({}, {}).forEach(function (obj) {
					//var ord = obj[orderField];
					var ord = obj.id;
					if (ord > beforeOrder && ord < afterOrder) {
						beforeOrder = ord;
					}
				});
				return (afterOrder + beforeOrder) / 2;
			} else {
				// find maximum order and place this one after it
				afterOrder = 0;
				store.query({}, {}).forEach(function (object) {
					var ord = object[orderField];
					if (ord > afterOrder) {
						afterOrder = ord;
					}
				});
				return afterOrder + 1;
			}
		},

		filterData:function (dataToFilter, filter) {
			var _filteredData = [];
			var exclude = false;
			var nFilters = filter.length;

			if (nFilters > 0) {
				array.forEach(dataToFilter, lang.hitch(this, function (item) {
					// loop through each filter
					for (var i = 0; i < nFilters; i++) {
						var _filterScale = number.parse(filter[i]);
						var _mapScale = item.scale;
						var _pos = array.indexOf(this.mapScaleValues, _filterScale);
						var _lowerBoundScale;
						var _upperBoundScale;
						var current;

						if (_pos !== -1) {
							if (this.TOPO_MAP_SCALES[_pos + 1] !== undefined) {
								_lowerBoundScale = this.TOPO_MAP_SCALES[(_pos + 1)].value;
							} else {
								_lowerBoundScale = "";
							}

							if (this.TOPO_MAP_SCALES[_pos].value) {
								current = this.TOPO_MAP_SCALES[_pos].value;
							}

							if (this.TOPO_MAP_SCALES[(_pos - 1)] !== undefined) {
								_upperBoundScale = this.TOPO_MAP_SCALES[(_pos)].value;
							} else {
								_upperBoundScale = "";
							}
						}

						if (_lowerBoundScale === "") {
							if (_mapScale <= _filterScale) {
								exclude = true;
								break;
							}
						}

						if (_upperBoundScale === "") {
							if (_mapScale >= _filterScale) {
								exclude = true;
								break;
							}
						}

						if (_lowerBoundScale !== "" && _upperBoundScale !== "") {
							if (_mapScale > _lowerBoundScale && _mapScale <= _upperBoundScale) {
								exclude = true;
								break;
							}
						}
					}

					if (!exclude) {
						_filteredData.push(item);
					}
					exclude = false;
				}));
				return _filteredData;
			} else {
				return dataToFilter;
			}
		},

		setClassname:function (scale) {
			var className;
			if (scale <= this.TOPO_MAP_SCALES[4].value) {
				className = "one";	// 0 - 12000
			} else if (scale > this.TOPO_MAP_SCALES[4].value && scale <= this.TOPO_MAP_SCALES[3].value) {
				className = "two";	// 12001 - 24000
			} else if (scale > this.TOPO_MAP_SCALES[3].value && scale <= this.TOPO_MAP_SCALES[2].value) {
				className = "three";// 24001 - 63360
			} else if (scale > this.TOPO_MAP_SCALES[2].value && scale <= this.TOPO_MAP_SCALES[1].value) {
				className = "four";	// 63361 - 125000
			} else if (scale > this.TOPO_MAP_SCALES[1].value) {
				className = "five";	// 125001 - 250000
			}
			return className;
		},

		setLodThreshold:function (scale) {
			var _lodThreshold;
			var i = this.nScales;
			while (i > 0) {
				if (scale <= this.minScaleValue) {
					_lodThreshold = this.TOPO_MAP_SCALES[this.TOPO_MAP_SCALES.length - 1].lodThreshold;
					break;
				}

				if (scale > this.TOPO_MAP_SCALES[i].value && scale <= this.TOPO_MAP_SCALES[i - 1].value) {
					_lodThreshold = this.TOPO_MAP_SCALES[i - 1].lodThreshold;
					break;
				}

				if (scale > this.maxScaleValue) {
					_lodThreshold = this.TOPO_MAP_SCALES[0].lodThreshold;
					break;
				}
				i--;
			}
			return _lodThreshold;
		},

		drawTimeline:function (data) {
			this.filteredData = this.filterData(data, this.filter);
			topic.subscribe("/dnd/drop", lang.hitch(this, function (source, nodes, copy, target) {
				var layers = [];
				//query(".grid-map").forEach(domConstruct.destroy);
				query(".dgrid-row").forEach(lang.hitch(this, function (node) {
					var row = target.grid.row(node);
					if (row) {
						console.log(row.data.id + "\t" + row.data.name + "\t" + row.data.imprintYear);
						layers.push(row.data.layer);
						this.map.removeLayer(row.data.layer);

						var lodThreshold = row.data.lodThreshold;
						var maskId = domAttr.get(node, "id") + "-mask";
						if (this.currentLOD <= lodThreshold) {
							// disable row
							if (dom.byId("" + maskId) === null) {
								domConstruct.create("div", {
									"id":"" + maskId,
									"class":"grid-map",
									"innerHTML":"<p style='text-align: center; margin-top: 20px'>" + this.config.THUMBNAIL_VISIBLE_THRESHOLD_MSG + "</p>"
								}, node, "first");
							}
						} else {
							// enable row
							domConstruct.destroy("" + maskId);
						}
					}
				}));

				var j = layers.length;
				while (j >= 0) {
					this.map.addLayer(layers[j]);
					j--;
				}
			}));

			if (this.timeline === undefined || this.timeline === null || this.timeline === "") {
				if (this.urlQueryObject) {
					this.timelineOptions.start = new Date(this.urlQueryObject.minDate, 0, 0);
					this.timelineOptions.end = new Date(this.urlQueryObject.maxDate, 0, 0);
				}
				this.timeline = new links.Timeline(dom.byId("timeline"));
				console.log(this.filteredData);
				this.timeline.draw(this.filteredData, this.timelineOptions);
				links.events.addListener(this.timeline, "ready", this.onTimelineReady);
				links.events.addListener(this.timeline, "select", lang.hitch(this, "onSelect"));
				//links.events.addListener(timeline, "rangechanged", timelineRangeChanged);
				this.userInterfaceUtils.hideStep(".stepOne", "");
				this.userInterfaceUtils.showStep(".stepTwo", ".step-two-message");
			} else {
				var height = this.timelineContainerGeometry ? this.timelineContainerGeometry.h : this.config.TIMELINE_HEIGHT;
				//this.timelineOptions.height = height + "px";
				//this.timeline.draw(this.filteredData, this.timelineOptions);
				this.timeline.setData(this.filteredData);
				this.timeline.redraw();
			}

			$(".timelineItemTooltip").tooltipster({
				theme:"tooltipster-shadow",
				contentAsHTML:true,
				position:"right",
				offsetY:20
			});


			query(".timeline-event").on(mouse.enter, lang.hitch(this, function (evt) {
				var xmin, ymin, xmax, ymax, extent, sfs;
				if (evt.target.children[0] !== undefined && evt.target.children[0].children[0] !== undefined) {
					if (evt.target.children[0].children[0].getAttribute("data-xmin")) {
						xmin = evt.target.children[0].children[0].getAttribute("data-xmin");
						xmax = evt.target.children[0].children[0].getAttribute("data-xmax");
						ymin = evt.target.children[0].children[0].getAttribute("data-ymin");
						ymax = evt.target.children[0].children[0].getAttribute("data-ymax");
						extent = new Extent(xmin, ymin, xmax, ymax, new SpatialReference({ wkid:102100 }));
						sfs = this.createMouseOverGraphic(
								new Color(this.config.TIMELINE_ITEM_MOUSEOVER_GR_BORDER),
								new Color(this.config.TIMELINE_ITEM_MOUSEOVER_GR_FILL));
						this.mouseOverGraphic = new Graphic(extent, sfs);
						this.map.graphics.add(this.mouseOverGraphic);
					}
					// TODO
					var data = evt.currentTarget.childNodes[0].childNodes[0].dataset;
					if (data) {
						extent = new Extent(data.xmin, data.ymin, data.xmax, data.ymax, new SpatialReference({ wkid:102100 }));
						sfs = this.createMouseOverGraphic(
								new Color(this.config.TIMELINE_ITEM_MOUSEOVER_GR_BORDER),
								new Color(this.config.TIMELINE_ITEM_MOUSEOVER_GR_FILL));
						this.mouseOverGraphic = new Graphic(extent, sfs);
						this.map.graphics.add(this.mouseOverGraphic);
					}
				}
			}));

			query(".timeline-event").on(mouse.leave, lang.hitch(this, function (evt) {
				this.map.graphics.remove(this.mouseOverGraphic);
				this.map.graphics.clear();
				this.addCrosshair(this.currentMapClickPoint);
			}));

			this.hideLoadingIndicator();
		},

		onSelect:function () {
			var sel = this.timeline.getSelection();
			var _timelineData = this.timeline.getData();
			if (sel.length) {
				if (sel[0].row !== undefined) {
					var row = sel[0].row;
					var objID = _timelineData[row].objID;

					var downloadLink = _timelineData[row].downloadLink;
					var lodThreshhold = _timelineData[row].lodThreshold;
					var whereClause = this.config.IMAGE_SERVER_WHERE + objID;
					var queryTask = new QueryTask(this.IMAGE_SERVICE_URL);
					var q = new Query();
					q.returnGeometry = false;
					q.outFields = this.OUTFIELDS;
					q.where = whereClause;
					var imageServiceLayer
					queryTask.execute(q, lang.hitch(this, function (rs) {
						var extent = rs.features[0].geometry.getExtent();
						var mapName = rs.features[0].attributes.Map_Name;
						var dateCurrent = rs.features[0].attributes.DateCurrent;

						if (dateCurrent === null)
							dateCurrent = this.config.MSG_UNKNOWN;
						var scale = rs.features[0].attributes.Map_Scale;
						var scaleLabel = number.format(scale, {
							places:0
						});

						var mosaicRule = new MosaicRule({
							"method":MosaicRule.METHOD_CENTER,
							"ascending":true,
							"operation":MosaicRule.OPERATION_FIRST,
							"where":whereClause
						});
						params = new ImageServiceParameters();
						params.noData = 0;
						params.mosaicRule = mosaicRule;
						imageServiceLayer = new ArcGISImageServiceLayer(this.IMAGE_SERVICE_URL, {
							imageServiceParameters:params,
							opacity:1.0
						});
						this.map.addLayer(imageServiceLayer);

						var _firstRow;
						if (query(".dgrid-row", this.grid.domNode)[0]) {
							var rowId = query(".dgrid-row", this.grid.domNode)[0].id;
							_firstRow = rowId.split("-")[2];
						}

						var firstRowObj = this.store.query({
							objID:_firstRow
						});

						this.store.put({
							id:1,
							objID:objID,
							layer:imageServiceLayer,
							name:mapName,
							imprintYear:dateCurrent,
							scale:scale,
							scaleLabel:scaleLabel,
							lodThreshold:lodThreshhold,
							downloadLink:downloadLink,
							extent:extent
						}), {
							before:firstRowObj[0]
						};
					})).then(lang.hitch(this, function (evt) {
						this.userInterfaceUtils.hideStep(".stepTwo", ".step-two-message");
						this.userInterfaceUtils.showStep(".stepThree", ".step-three-message");
						this.showGrid();
						this.grid.refresh();
					}));
				}
			}
		},

		showGrid:function () {
			query(".gridContainer").style("display", "block");
			this.userInterfaceUtils.hideStep(".stepTwo", ".step-two-message");
		},

		hideLoadingIndicator:function () {
			esri.hide(this._loading);
			this.map.enableMapNavigation();
		},

		onTimelineReady:function () {
			// if the grid is visible, step 3 is visible, so hide step 2
			if (domStyle.get(query(".gridContainer")[0], "display") === "block") {
				this.userInterfaceUtils.hideStep(".stepTwo", ".step-two-message");
			}
		},

		showLoadingIndicator:function () {
			esri.show(this._loading);
			this.map.disableMapNavigation();
		},

		runQuery:function (mapExtent, mp, lod) {
			var queryTask = new QueryTask(this.config.QUERY_TASK_URL);
			var q = new Query();
			q.returnGeometry = true;
			q.outFields = this.config.QUERY_TASK_OUTFIELDS;
			q.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
			// TODO confirm with CF/SB where clause is correct
			if (this.config.QUERY_WHERE !== "") {
				q.where = this.config.QUERY_WHERE;
			}
			if (this.config.QUERY_GEOMETRY === "MAP_POINT") {
				q.geometry = mp;
			} else {
				q.geometry = mapExtent.expand(this.config.EXTENT_EXPAND);
			}

			this.showLoadingIndicator();
			var deferred = queryTask.execute(q).addCallback(lang.hitch(this, function (response) {
				this.timelineData = [];
				var nFeatures = response.features.length;

				if (nFeatures > 0) {
					query(".timeline-mask").forEach(domConstruct.destroy);
					this.timelineContainerNodeGeom = domStyle.getComputedStyle(this.timelineContainerNode);
					this.timelineContainerGeometry = domGeom.getContentBox(this.timelineContainerNode, this.timelineContainerNodeGeom);
					if (this.timelineContainerGeometry.h === 0) {
						var n = registry.byId("timeline-container").domNode;
						fx.animateProperty({
							node:n,
							duration:1000,
							properties:{
								height:{
									end:parseInt(this.config.TIMELINE_HEIGHT) + 20
								}
							},
							onEnd:function () {
								registry.byId("main-window").layout();
							}
						}).play();
					}

					array.forEach(response.features, lang.hitch(this, function (feature) {
						var ext = feature.geometry.getExtent();
						var xmin = ext.xmin;
						var xmax = ext.xmax;
						var ymin = ext.ymin;
						var ymax = ext.ymax;

						var objID = feature.attributes[this.config.ATTRIBUTE_OBJECTID];
						var mapName = feature.attributes[this.config.ATTRIBUTE_MAP_NAME];
						var scale = feature.attributes[this.config.ATTRIBUTE_SCALE];
						var dateCurrent = new Date(feature.attributes[this.config.ATTRIBUTE_DATE]);
						if (dateCurrent === null)
							dateCurrent = this.config.MSG_UNKNOWN;
						var day = this.formatDay(dateCurrent);
						var month = this.formatMonth(dateCurrent);
						var year = this.formatYear(dateCurrent);
						var formattedDate = month + "/" + day + "/" + year;

						var startDate = new Date(dateCurrent, month, day);

						var downloadLink = feature.attributes[this.config.ATTRIBUTE_DOWNLOAD_LINK];
						var citation = feature.attributes[this.config.ATTRIBUTE_CITATION];

						var className = this.setClassname(scale);
						var lodThreshold = this.setLodThreshold(scale);

						var tooltipContent = "<img class='tooltipThumbnail' src='" + this.config.IMAGE_SERVER + "/" + objID + this.config.INFO_THUMBNAIL + "'>" +
								"<div class='tooltipContainer'>" +
								"<div class='tooltipHeader'>" + mapName + " (" + formattedDate + ")</div>" +
								"<div class='tooltipContent'>" + citation + "</div></div>";

						var timelineItemContent = '<div class="timelineItemTooltip noThumbnail" title="' + tooltipContent + '" data-xmin="' + xmin + '" data-ymin="' + ymin + '" data-xmax="' + xmax + '" data-ymax="' + ymax + '">' +
								'<span class="thumbnailLabel">' + mapName + '</span>';

						this.timelineData.push({
							"start":startDate,
							"content":timelineItemContent,
							"objID":objID,
							"downloadLink":downloadLink,
							"scale":scale,
							"lodThreshold":lodThreshold,
							"className":className
						});
					})); // END forEach
				} else {
					this.addNoResultsMask();
				} // END QUERY
				this.drawTimeline(this.timelineData);
			})); // END Deferred
		},

		formatDay:function (date) {
			if (date instanceof Date)
				return date.getDate();
			else
				return "";
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
		},

		addNoResultsMask:function () {
			domConstruct.create("div", {
				"class":"timeline-mask",
				"innerHTML":"<p style='text-align: center; margin-top: 20px'>" + this.config.MSG_NO_MAPS + "</p>"
			}, "timeline", "first");
		},

		setSharingUrl:function () {
			var mapClickX,
					mapClickY,
					timelineDateRange = "",
					minDate = "",
					maxDate = "",
					objectIDs = "",
					downloadIDs = "",
					filters = "";
			if (!this.currentMapClickPoint) {
				// User is sharing the app but never even clicked on the map
				// Leave these params empty
				mapClickX = "";
				mapClickY = "";
			} else {
				mapClickX = this.currentMapClickPoint.x;
				mapClickY = this.currentMapClickPoint.y;
			}

			var lat = this.map.extent.getCenter().getLatitude();
			var lng = this.map.extent.getCenter().getLongitude();
			var zoomLevel = this.map.getLevel();

			if (this.timeline) {
				timelineDateRange = this.timeline.getVisibleChartRange();
				minDate = new Date(timelineDateRange.start).getFullYear();
				maxDate = new Date(timelineDateRange.end).getFullYear();
			}

			query(".dgrid-row", grid.domNode).forEach(function (node) {
				var row = this.grid.row(node);
				objectIDs += row.data.objID + "|";
				downloadIDs += row.data.downloadLink.split("=")[1] + "|";
			});
			objectIDs = objectIDs.substr(0, objectIDs.length - 1);
			downloadIDs = downloadIDs.substr(0, downloadIDs.length - 1);

			array.forEach(this.filterSelection, function (filter) {
				filters += filter + "|";
			});
			filters = filters.substr(0, filters.length - 1);

			var protocol = window.location.protocol;
			var host = window.location.host;
			var pathName = window.location.pathname;
			var fileName = "";
			var pathArray = window.location.pathname.split("/");
			if (pathArray[pathArray.length - 1] !== "index.html") {
				fileName = "index.html";
			} else {
				fileName = "";
			}

			this.sharingUrl = protocol + "//" + host + pathName + fileName +
					"?lat=" + lat + "&lng=" + lng + "&zl=" + zoomLevel +
					"&minDate=" + minDate + "&maxDate=" + maxDate +
					"&oids=" + objectIDs +
					"&dlids=" + downloadIDs +
					"&f=" + filters +
					"&clickLat=" + mapClickX +
					"&clickLng=" + mapClickY;
			return this.sharingUrl;
		},

		documentClickHandler:function (evt) {
			if (!$("#bitlyIcon").is(evt.target) && !$("#bitlyInput").is(evt.target) && !$(".popover-content").is(evt.target)) {
				$(".popover").hide();
			}
		},

		shareFacebook:function () {
			var url = this.setSharingUrl();
			var options = '&p[title]=' + encodeURIComponent($('#title').text())
					+ '&p[summary]=' + encodeURIComponent($('#subtitle').text())
					+ '&p[url]=' + encodeURIComponent(url)
					+ '&p[images][0]=' + encodeURIComponent($("meta[property='og:image']").attr("content"));

			window.open('http://www.facebook.com/sharer.php?s=100' + options, 'Facebook sharing', 'toolbar=0,status=0,width=626,height=436'
			);
		},

		shareTwitter:function () {
			var url = this.setSharingUrl();

			var bitlyUrls = [
				"http://api.bitly.com/v3/shorten?callback=?",
				"https://api-ssl.bitly.com/v3/shorten?callback=?"
			];
			var bitlyUrl = location.protocol === 'http:' ? bitlyUrls[0] : bitlyUrls[1];

			var urlParams = esri.urlToObject(url).query || {};
			var targetUrl = url;

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
		},

		requestBitly:function () {
			var url = this.setSharingUrl();
			var bitlyUrls = [
				"http://api.bitly.com/v3/shorten?callback=?",
				"https://api-ssl.bitly.com/v3/shorten?callback=?"
			];
			var bitlyUrl = location.protocol === 'http:' ? bitlyUrls[0] : bitlyUrls[1];

			var urlParams = esri.urlToObject(url).query || {};
			var targetUrl = url;

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
		}
	});
})
;