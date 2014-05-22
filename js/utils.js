function createOrderedStore(data, options) {
	// Instantiate a Memory store modified to support ordering.
	return Observable(new Memory(lang.mixin({data: data,
		idProperty: "id",
		put: function (object, options) {
			object.id = calculateOrder(this, object, options && options.before);
			return Memory.prototype.put.call(this, object, options);
		},
		// Memory's add does not need to be augmented since it calls put
		copy: function (object, options) {
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
		query: function (query, options) {
			options = options || {};
			options.sort = [
				{attribute: "id"}
			];
			return Memory.prototype.query.call(this, query, options);
		}
	}, options)));
}


function calculateOrder(store, object, before, orderField) {
	// Calculates proper value of order for an item to be placed before another
	var afterOrder, beforeOrder = 0;
	if (!orderField) {
		orderField = "id";
	}

	if (before) {
		// calculate midpoint between two items' orders to fit this one
		afterOrder = before[orderField];
		store.query({}, {}).forEach(function (object) {
			var ord = object[orderField];
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
}


function createMap() {
	map = new Map('map', {
		basemap: 'topo',
		//center:[-71.060944, 42.350663],
		center: [-117.199402, 34.056339],
		zoom: 10
	});
}

function clearMap() {
	for (var i = 0; i < swipeLayers.length; i++) {
		map.removeLayer(swipeLayers[i]);
	}
	swipeLayers = [];
	swipeWidget.destroy();
	domConstruct.empty('firstSel');
	domConstruct.empty('secSel');
}

function createSelectedThumb(objID, id, name, year) {
	if (!year)
		year = 'Unknown';
	domConstruct.create('img', {
				src: 'http://historical1.arcgis.com/arcgis/rest/services/USA_Historical_Topo_Maps/ImageServer/' + objID + '/info/thumbnail?token=' + token + ''
			},
			dom.byId('selTopoThumbnail'));

	domConstruct.create('div', {
		innerHTML: '<p>' + name + '<br />' + year + '</p>'
	}, dom.byId(id));
}


function setEsriMapScaleOutput(scale) {
	$('.esriMapScale').empty().append('Map Scale  ' + number.format(scale, {
		places: 0
	}));
}

function setTopoMapScaleOutput(scale) {
	$('.topoMapScale').empty().append('Topo Map Scale  1:' + number.format(scale, {
		places: 0
	}));
}

function loadGeocoderDijit(srcRef) {
	geocoder = new Geocoder({
		map: map,
		autoComplete: true,
		showResults: true,
		placeholder: 'Find a Place'
	}, srcRef);
	geocoder.startup();
}

function loadHomeButtonDijit(srcRef) {
	var home = new HomeButton({
		map: map
	}, srcRef);
	home.startup();
}

function setText(node, text) {
	node = dojo.byId(node);
	node.innerHTML = text;
}