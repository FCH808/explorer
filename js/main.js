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
	"dojo/dom",
	"dojo/dom-attr",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"dojo/io-query",
	"dojo/json",
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
	"esri/geometry/Point",
	"esri/SpatialReference",
	"esri/map",
	"esri/tasks/query",
	"esri/tasks/QueryTask",
	"esri/urlUtils",
	"application/uiUtils",
	"application/gridUtils",
	"application/timelineLegendUtils",
	"application/sharingUtils",
	"application/mapUtils",
	"application/timelineUtils"
], function (ready, array, declare, fx, lang, Deferred, dom, domAttr, domClass, domConstruct, domGeom, domStyle, ioQuery, json, number, on, parser, all, query, topic, Observable, Memory, DnD, OnDemandGrid, editor, Selection, Keyboard, mouseUtil, Button, HorizontalSlider, BorderContainer, ContentPane, registry, arcgisUtils, Geocoder, Point, SpatialReference, Map, Query, QueryTask, urlUtils, UserInterfaceUtils, GridUtils, TimelineLegendUtils, SharingUtils, MappingUtils, TimelineUtils) {
	return declare(null, {

		OUTFIELDS: "",
		IMAGE_SERVICE_URL: "",
		imageServiceLayer: "",
		DOWNLOAD_PATH: "",
		TOPO_MAP_SCALES: "",
		mapScaleValues: [],

		nScales: "",
		maxScaleValue: "",
		minScaleValue: "",

		_loading: "",
		urlQueryObject: "",

		currentLOD: "",
		currentMapClickPoint: "",
		currentMapExtent: "",

		data: "",
		grid: "",
		store: "",
		storeData: [],

		timelineContainerNode: "",

		mouseOverGraphic: "",
		filterSelection: [],
		filter: [],
		filteredData: "",

		userInterfaceUtils: {},
		gridUtils: {},
		timelineLegendUtils: {},
		sharingUtils: {},
		mapUtils: {},
		timelineUtils: {},

		minimumId: "",

		config: {},

		startup: function (config) {
			// config will contain application and user defined info for the template such as i18n strings, the web map id
			// and application id
			// any url parameters and any application specific configuration information.
			if (config) {
				this.config = config;
				// document ready
				ready(lang.hitch(this, function () {

					this.userInterfaceUtils = new UserInterfaceUtils(this, this.config);
					this.gridUtils = new GridUtils(this, this.config);
					this.timelineLegendUtils = new TimelineLegendUtils(this.config);
					this.timelineUtils = new TimelineUtils(this, this.config);
					this.sharingUtils = new SharingUtils(this.config);
					this.mapUtils = new MappingUtils(this.config);

					//supply either the webmap id or, if available, the item info
					var itemInfo = this.config.itemInfo || this.config.webmap;
					this._createWebMap(itemInfo);

					this.OUTFIELDS = this.config.OUTFIELDS;
					this.IMAGE_SERVICE_URL = this.config.IMAGE_SERVER;
					this.TOPO_MAP_SCALES = this.config.TIMELINE_LEGEND_VALUES;
					this.DOWNLOAD_PATH = this.config.DOWNLOAD_PATH;

					for (var i = 0; i < this.TOPO_MAP_SCALES.length; i++) {
						this.mapScaleValues.push(this.TOPO_MAP_SCALES[i].value);
					}

					this.nScales = this.timelineLegendUtils.getNumberOfScales(this.TOPO_MAP_SCALES);
					this.maxScaleValue = this.timelineLegendUtils.getMaxScaleValue(this.TOPO_MAP_SCALES);
					this.minScaleValue = this.timelineLegendUtils.getMinScaleValue(this.TOPO_MAP_SCALES);

					this.userInterfaceUtils.loadAppStyles();

					this._loading = dom.byId("loadingImg");
					this.urlQueryObject = this._getUrlParameters();
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
							renderCell:lang.hitch(this, this.gridUtils.thumbnailRenderCell)
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
						store:this.store = this._createOrderedStore(this.storeData, {
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

					this.grid.on("dgrid-datachange", this.gridUtils.gridDataChangeHandler);
					this.grid.on("dgrid-refresh-complete", this.gridUtils.gridRefreshHandler);
					this.grid.on(mouseUtil.enterCell, lang.hitch(this, this.gridUtils.gridEnterCellHandler));
					this.grid.on(mouseUtil.leaveCell, lang.hitch(this, this.gridUtils.gridLeaveCellHandler));

					// timeline options
					/*this.timelineOptions = {
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
					};*/
					array.forEach(this.config.TIMELINE_LEGEND_VALUES, lang.hitch(this, this.timelineLegendUtils.buildLegend));

					this.userInterfaceUtils.watchSplitters(registry.byId("main-window"));

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
				this.userInterfaceUtils.addCrosshair(_mp);
			}

			//// external logic ////
			// Load the Geocoder Dijit
			this._initGeocoderDijit("geocoder");

			on(this.map, "click", lang.hitch(this, this.mapUtils.mapClickHandler));
			on(this.map, "extent-change", lang.hitch(this, this.mapUtils.mapExtentChangeHandler));
			on(this.map, "update-start", lang.hitch(this, this.mapUtils.updateStartHandler));
			on(this.map, "update-end", lang.hitch(this, this.mapUtils.updateEndHandler));
			on(document, ".share_facebook:click", lang.hitch(this, this.sharingUtils.shareFacebook));
			on(document, ".share_twitter:click", lang.hitch(this, this.sharingUtils.shareTwitter));
			on(document, ".share_bitly:click", lang.hitch(this, this.sharingUtils.requestBitly));
			on(document, "click", lang.hitch(this, this.sharingUtils.documentClickHandler));
		},

		_getUrlParameters:function () {
			var urlObject = urlUtils.urlToObject(window.location.href);
			return urlObject.query;
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

		// dojo src
		_createOrderedStore:function (data, options) {
			var opts = options;
			// Instantiate a Memory store modified to support ordering.
			return Observable(new Memory(lang.mixin({
				data:data,
				idProperty:"id",
				put:lang.hitch(this, function (object, opts) {
					var storeRef = this.store;
					var _calc = lang.hitch(this, function () {
						return this._calculateOrder(storeRef, object, opts && opts.before);
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

		// dojo src
		_calculateOrder:function (store, object, before, orderField) {
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

		_filterData:function (dataToFilter, filter) {
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
		}
	});
});