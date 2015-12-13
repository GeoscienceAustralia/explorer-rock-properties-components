# explorer-rock-properties-components

AngularJS components related to rock properties, for use with CesiumJS.<br/>
This project is under development, and not ready for use.

Potential functionality:

<ul>
	<li>Leverage data from rock properties Geoserver web service: http://www.ga.gov.au/geophysics-rockpropertypub-gws/web/</li>
	<li>Visualisation of data points, possibly clustering, or simple WMS imagery</li>
	<li>Filtering of rock properties data points</li>
	<li>Point or cluster inspector to reveal fine-grain data records, and/or high level charts/visualsation of aggregated data.</li>
	<li>Clip, zip, ship</li>
</ul>	

# Get started

```shell
$ npm install
$ bower install
$ tsd install
$ gulp
```


# Usage

`rocksPanelService.init(viewer, config)` is the entry point for the component.

It should be initialised with a <a href="https://cesiumjs.org/Cesium/Build/Documentation/Viewer.html">CesiumJS Viewer</a>, and a JSON config object for service endpoints/params.

Example config:

```json
"rockProps": {
	"useClusterPicking": true,
	"clusterServiceUrl": "resources/mock-service/explorer-cossap-services/service/rock-properties/clusters",
	"geoserverWmsUrl": "http://www.ga.gov.au/geophysics-rockpropertypub-gws/ga_rock_properties_wms/wms",
	"geoserverWmsVersion": "1.3.0",
	"geoserverWfsUrl": "http://www.ga.gov.au/geophysics-rockpropertypub-gws/ga_rock_properties_wfs/wfs/ows",
	"geoserverWfsVersion": "1.3.0",
	"geoserverWfsExportParams": {
	  "service": "wfs",
	  "version": "2.0.0",
	  "request": "GetFeature",
	  "count": 99999999,
	  "srsName": "epsg:4283"
	},
	"geoserverWfsExportFormats": ["csv", "application/json", "KML", "SHAPE-ZIP"],
	"geoserverWmsLegendParams": {
	  "REQUEST": "GetLegendGraphic",
	  "VERSION": "1.0.0",
	  "FORMAT": "image/png",
	  "WIDTH": 20,
	  "HEIGHT": 20,
	  "legend_options": "dpi:160;forcelabels:on;fontSize:7"
	},
	"geoserverDashboardUrl": "http://www.ga.gov.au/geophysics-rockpropertypub-gws/web/?wicket:bookmarkablePage=:org.geoserver.web.demo.MapPreviewPage",
	"filterNamesServiceUrl": "http://www.ga.gov.au/explorer-web/service/rockprops/filters"
  }
```

# Dependencies

This component uses:

<ul>
	<li><a href="http://cesiumjs.org/">CesiumJS</a></li>
	<li><a href="http://d3js.org/">D3.js</a></li>
	<li><a href="http://fortawesome.github.io/Font-Awesome/">Font Awesome icons</a></li>
	<li><a href="https://stuk.github.io/jszip/">JSZIP</a></li>
	<li><a href="https://github.com/Teleborder/FileSaver.js">FileSaver.js</a></li> 
</ul>
