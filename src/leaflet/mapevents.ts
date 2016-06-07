/// <reference path="../../typings/browser.d.ts" />

'use strict';

module rpComponents.mapevents {

angular.module("explorer.rockproperties.mapevents", [
   'geo.map'
])

.directive('rockMapevents', ['rockpropertiesMapeventsService', function(rockpropertiesMapeventsService: any) {
  return {
    restrict: 'AE',
    link: function(scope:any) {
      rockpropertiesMapeventsService.tickle();
    }
  }
}])

.factory('rockpropertiesMapeventsService', ['$rootScope', '$timeout', 'configService', 'mapService',
        function($rootScope: ng.IRootScopeService, $timeout: any, configService: any, mapService: any) {
    var marker: any, poly: any;
    var config = configService.getConfig("mapConfig");

		if(config.listenForExtentEvent) {
			$rootScope.$on(config.listenForExtentEvent, function showBbox(event: any, geojson: GeoJSON.Feature) {
				// It's a GeoJSON Polygon geometry and it has a single ring.
				makePoly(geojson);
			});
		}

		if(config.listenForMarkerEvent) {
			$rootScope.$on(config.listenForMarkerEvent, function showBbox(event: any, geojson:any) {
				// It's a GeoJSON Polygon geometry and it has a single ring.
				makeMarker(geojson);
			});
		}

		function makeMarker(data: any) {
      mapService.getMap().then(function(map: any) {
	  		if(marker) {
	  			map.removeLayer(marker);
  			}
				if(!data) {
					return;
				}

			  let point: any;
			  if(typeof data.properties.SAMPLE_LONGITUDE != "undefined") {
				  point= {
					  type: "Point",
					  coordinates: [
						  data.properties.SAMPLE_LONGITUDE,
					  	data.properties.SAMPLE_LATITUDE
	  				]
	  			};
	  		} else {
	  			point = data.geometry;
	  		}
  			marker = L.geoJson({
  				type:"Feature",
  				geometry: point,
  				id: data.id
	  		}).addTo(map);
	  		if(data.properties.html) {
	   			marker.bindPopup(data.properties.html).openPopup();
	  		}
  		});
    }

		function makePoly(data: GeoJSON.Feature) {
      console.log("pre getting map to make poly");
      mapService.getMap().then(function(map: any) {

        console.log("getting map to make poly");
		    if(poly) {
		      map.removeLayer(poly);
		    }

  	    poly = L.geoJson(data, {
          style: function (feature) {
		 		    return {
               opacity:1,
               clickable: false,
               fillOpacity:0,
               color: "red"
            };
          }
		    }).addTo(map);

        $timeout(() => {
          var bounds = poly.getBounds()
			    map.fitBounds(bounds, {
				    animate: true,
				    padding: L.point(100,100)
			    });
        }, 50);
      });
		}

		function clip(num: number, min: number, max: number) {
			return Math.min(Math.max(num, min), max);
		}

    return {
      tickle: function() {
        mapService.getMap().then(function(map: any) {
          map.on('click', function(event: any) {
            var zoom = map.getZoom();
            var latlng = event.latlng;
            $rootScope.$broadcast("zoom.to", {
              zoom: zoom,
              latlng: latlng
            });
          });
        });
      }
    };

}]);


}