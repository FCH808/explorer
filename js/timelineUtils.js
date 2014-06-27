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
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dojo/number",
	"dojo/on",
	"dojo/query"
], function (declare, lang, dom, domAttr, domClass, domConstruct, domStyle, number, on, query) {
	return declare(null, {

		config: {},

		constructor: function (templateConfig) {
			this.config = templateConfig;
		},

		buildLegend: function (legendItem) {
			var node = domConstruct.toDom('<label data-scale="' + legendItem.value + '" data-placement="right" class="btn toggle-scale active" style="background-color: ' + legendItem.color + '">' +
					'<input type="checkbox" name="options"><span data-scale="' + legendItem.value + '">' + legendItem.label + '</span>' +
					'</label>');

			if (this.urlQueryObject) {
				var tmpFilters = this.urlQueryObject.f.split("|"),
					num = number.format(legendItem.value, {
						places: 0,
						pattern: "#"
					}),
					i = tmpFilters.indexOf(num);
				if (tmpFilters[i] !== undefined) {
					domClass.toggle(node, "sel");
					domStyle.set(node, "opacity", "0.3");
					this.filter.push(tmpFilters[i]);
				}
			}

			on(node, "click", lang.hitch(this, function (evt) {
				var selectedScale = evt.target.getAttribute("data-scale"),
					selectedScaleIndex = this.filter.indexOf(selectedScale);

				domClass.toggle(node, "sel");

				if (domClass.contains(node, "sel")) {
					if (selectedScaleIndex === -1) {
						this.filter.push(selectedScale);
					}
					domStyle.set(node, "opacity", "0.3");
					this.filterSelection.push(selectedScale);
				} else {
					if (selectedScaleIndex !== -1) {
						this.filter.splice(selectedScaleIndex, 1);
					}
					domStyle.set(node, "opacity", "1.0");
					var i = this.filterSelection.indexOf(selectedScale);
					if (i !== -1) {
						this.filterSelection.splice(i, 1);
					}
				}
				this._drawTimeline(this.timelineData);
			}));
			domConstruct.place(node, query(".topo-legend")[0]);
		}
	});
});