# explorer-rock-properties-components
AngularJS components related to rock properties, for use with CesiumJS.
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

<code>
$ npm install<br/>
$ bower install<br/>
$ tsd install<br/>
$ gulp
</code>


# Use

`rocksPanelService.init(viewer, config)` is the entry point for the component.

It should be initialised with a Cesium Viewer, and a config object for service endpoints/params, e.g.

<code>
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
</code>

# Dependencies

This component uses:

<ul>
	<li>Font Awesome icons: http://fortawesome.github.io/Font-Awesome/</li>
	<li>JSZIP: https://stuk.github.io/jszip/</li>
	<li>FileSaver.js: https://github.com/Teleborder/FileSaver.js</li> 
</ul>
