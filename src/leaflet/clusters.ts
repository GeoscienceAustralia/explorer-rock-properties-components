/// <reference path="../../typings/browser.d.ts" />
/// <reference path="../components/charts" />
/// <reference path="../components/config" />
/// <reference path="../components/cluster-filters" />
/// <reference path="../components/spinner" />
/// <reference path="cluster-inspector" />
/// <reference path="zoom" />

declare var d3: any;

module rpComponents.clusterService {

    'use strict';

    export interface IClusterService {
        clusterFilter: string;

        toggleClusters(): boolean;
        reCluster(filters?: string): void;
    }

    export interface IClusterHeightWeighter {
        calculateWeighting(zoom: number): number;
    }

    export class ClusterHeightWeighter implements IClusterHeightWeighter {
        calculateWeighting(zoom: number): number {
            return Math.pow(1.43, zoom);
        }
    }

    export class ClusterService implements IClusterService {
       private layer: L.GeoJSON;
       private map: L.Map;
       private serviceUrl: string;
       private sequence: number = 0;
       private showClusters = false;
       clusterFilter: string = '';

       static $inject = [
            "$http",
            "$rootScope",
            "zoomLevelService",
            "clusterChartService",
            "loadingSpinnerService",
            "rocksConfigService",
            "clusterInspectorService",
            "clusterFilterState"
       ];

       constructor(
            public $http: ng.IHttpService,
            public $rootScope: ng.IRootScopeService,
            public zoomLevelService: rpComponents.zoom.IZoomLevelService,
            public clusterChartService: rpComponents.chartService.IClusterChartService,
            public loadingSpinnerService: rpComponents.spinnerService.ILoadingSpinnerService,
            public rocksConfigService: rpComponents.config.IRocksConfigService,
            public clusterInspectorService: rpComponents.clusterInspector.IClusterInspectorService,
            public clusterFilterState: rpComponents.filters.IClusterFilterState

       ) {
          this.$rootScope.$on('rocks.config.ready', () => {
              this.map = this.rocksConfigService.map;
              this.serviceUrl = this.rocksConfigService.config.rocksServiceUrl;
              this.init();
          });
       }

       private _refreshClusters() {
         if(this.layer) {
		 	  this.map.removeLayer(this.layer);
		 	  this.layer = null;
		   }
		    	
		   var instanceSequence = ++this.sequence;
		   var zoom = this.map.getZoom();
		   var bounds = this.map.getBounds();
		   var parms: string[] = [];
		   parms.push("xmin=" + Math.max(bounds.getWest() - 24/Math.pow(zoom, 1.2), 40)); + 
		   parms.push("xmax=" + Math.min(bounds.getEast() + 24/Math.pow(zoom, 1.2), 179));
		   parms.push("ymin=" + Math.max(bounds.getSouth() - 12/Math.pow(zoom, 1.2), -89));
		   parms.push("ymax=" + Math.min(bounds.getNorth() + 12/Math.pow(zoom, 1.2), 10)); 
		   parms.push("zoom=" + (Math.max(zoom, 6)));
		    	
		   var geojsonMarkerOptions = {
		      radius: 8,
		      fillColor: "#ff0000",
		      color: "#000",
		      weight: 1,
		      opacity: 1,
		      fillOpacity: 0.8
		   };		    	
		   
         var rootScope = this.$rootScope;
         		    		        
		   this.$http.get(this.serviceUrl + "summary?" + parms.join("&") + this.clusterFilterState.filterQuery).then((result: any) => {
		   	if(instanceSequence < this.sequence) {
		   		return;
		   	}
            
            var maxCount = d3.max(result.data.features, function(item: any) {
		   		return item.properties.count;
		   	});
		    	this.layer =null
             
             	
		   	this.layer = L.geoJson(result.data, {
		   	   pointToLayer: function (feature, latlng) {
		   		  	var geojsonMarkerOptions = {
		    		  	    radius: 4 + 20 * Math.pow(feature.properties.count / maxCount, 0.2),
		    		  	    fillColor: "#ff0000",
		    		  	    color: "#000",
		    		  	    weight: 1,
		    		  	    opacity: 1,
		    		  	    fillOpacity: 0.8
		    		  	};
		    		   var marker = L.circleMarker(latlng, geojsonMarkerOptions)
		    		        	.bindLabel("" + feature.properties.count, { noHide: zoom > 5 });
		    		   marker.on("click", function() {
		    		     	var id = this.feature.id.split("/");
		    		      
                     rootScope.$broadcast('rocks.cluster.selected', {
	     		      	   zoom: id[0],
	       	   	     	x: id[1],
	      		        	y: id[2]
   	    		     	});
		    		   });
		    		   return marker;
		    		}
		      });
            this.layer.addTo(this.map);
		    });
       }

       init():void {
          var self = this;
          this.map.on('zoomend', movePan);
          this.map.on('dragend', movePan);

		    function movePan(event: any) {
             if(!self.showClusters) {
                return;
             }
             self._refreshClusters();
		    }			
       }
        
       toggleClusters(): boolean {
          if(this.showClusters = !this.showClusters) {
              this._refreshClusters();
          } else if(this.layer) {
		 	     this.map.removeLayer(this.layer);
		 	     this.layer = null;
		    }  
          return this.showClusters;
       }


        /**
         *
         * We get a performance benefit when we use fewer
         * primitives/collections to draw multiple static geometries.
         *
         */
        reCluster = (): void => {
           this._refreshClusters();
        };
    }

    angular
        .module('explorer.rockproperties.clusters', [])
        .factory("clusterService", [
            "$http",
            "$rootScope",
            "zoomLevelService",
            "clusterChartService",
            "loadingSpinnerService",
            "rocksConfigService",
            "clusterInspectorService",
            "clusterFilterState",
        (
            $http: ng.IHttpService,
            $rootScope: ng.IRootScopeService,
            zoomLevelService: rpComponents.zoom.IZoomLevelService,
            clusterChartService: rpComponents.chartService.IClusterChartService,
            chartSpinnerService: rpComponents.spinnerService.ILoadingSpinnerService,
            rocksConfigService: rpComponents.config.IRocksConfigService,
            clusterInspectorService: rpComponents.clusterInspector.IClusterInspectorService,
            clusterFilterState: rpComponents.filters.IClusterFilterState
        ) =>
        new rpComponents.clusterService.ClusterService(
            $http,
            $rootScope,
            zoomLevelService,
            clusterChartService,
            chartSpinnerService,
            rocksConfigService,
            clusterInspectorService,
            clusterFilterState
        )]);

}
