/// <reference path="../../typings/tsd.d.ts" />

declare var JSZip: any;
declare var saveAs: any;

module rpComponents.queryBuilderExport {

    'use strict';

    export interface IQueryBuilder {
        exportUrl: string;
        loading: boolean;
        startClipShip(features: any, format: string, extent: any): void;
    }

    export class QueryBuilder implements IQueryBuilder {

        exportUrl: string;
        loading: boolean;
        loadingSpinner: any;

        baseUrl: string;
        wfsLayerNames: [string];
        propertyQuery: string = "";

        $inject = [
            "$q",
            "$http",
            "$rootScope",
            "loadingSpinnerService",
            "rocksClipShipService",
            "rocksConfigService",
            "gwsUtilService"
        ];

        constructor(
            public $q: ng.IQService,
            public $http: ng.IHttpService,
            public $rootScope: ng.IRootScopeService,
            public loadingSpinnerService: rpComponents.spinnerService.ILoadingSpinnerService,
            public rocksClipShipService: rpComponents.clipShipService.IRocksClipShipService,
            public rocksConfigService: rpComponents.config.IRocksConfigService,
            public gwsUtilService: rpComponents.gwsUtilService.IGwsUtilService
        ) {

            this.$rootScope.$on("rocks.config.ready", () => {

                // build base query URL from config
                this.baseUrl = this.rocksConfigService.config.geoserverWfsUrl + "?";
                angular.forEach(this.rocksConfigService.config.geoserverWfsExportParams, (value: any, key: any) => {
                    this.baseUrl += key +"="+ value +"&";
                });
                // lose trailing &
                this.baseUrl = this.baseUrl.slice(0, -1);

                // get WFS layer names
                this.gwsUtilService.getWfsFeatureTypeNames().then((layerNames: [string]) => {
                    this.wfsLayerNames = layerNames;
                });
            });
        }

        startClipShip(features: any, format: string, extent: any): void {

            // TODO fire flasher event for UI?
            this.loading = true;

            // init spinner
            if(!this.loadingSpinner){
                this.loadingSpinner = this.loadingSpinnerService.addSpinner({
                    width: 80,
                    height: 80,
                    container: "#rock-clip-ship-loading",
                    id: "clip-ship-spinner"
                });
                this.loadingSpinner();
            }

            var targetFeatures: any = [];
            for(var i = 0; i < features.length; i++){
                if(features[i].isSelected) targetFeatures.push(features[i].name);
            }

            if(format === "csv"){

                var zip: any = new JSZip();

                // give zip file to decent browsers
                if(JSZip.support.blob){

                    //showLoading = true;
                    var promises: any = [];

                    console.log("this.wfsLayerNames");
                    console.log(this.wfsLayerNames);

                    // create a Get query for each layer
                    for(var i = 0; i < this.wfsLayerNames.length; i++){

                        var query: string = this.buildQuery(targetFeatures, extent, format, [this.wfsLayerNames[i]]);
                        var promise: any = this.$http.get(query);
                        promises.push(promise);
                    }

                    this.$q.all(promises).then((results: any) => {

                        for(var i = 0; i < results.length; i++){

                            // we'll assume that if there's more than one line we've got data to write
                            var numberOfLineBreaks: number = (results[i]['data'].match(/\n/g)||[]).length;
                            if (numberOfLineBreaks > 1) {

                                var filename: string = this.wfsLayerNames[i].split(' ').join('-');
                                zip.file(filename +".csv", results[i]['data']+"\n");
                            }
                        }

                        // FileSaver.js
                        var content: any = zip.generate({type:"blob"});
                        saveAs(content, "rocks-export.zip");

                        this.loading = false;
                        this.rocksClipShipService.step = 'startDraw';
                    });
                }

                else {
                    // just give separate file for each layer
                    for(var i = 0; i < this.wfsLayerNames.length; i++){
                        window.open(this.buildQuery(targetFeatures, extent, format, [this.wfsLayerNames[i]]));
                    }
                    this.loading = false;
                }
            }

            else {
                // give the user the query url directly
                this.exportUrl = this.buildQuery(targetFeatures, extent, format, this.wfsLayerNames);
                this.loading = false;
            }
        }

        buildQuery(properties: any, extent: any, format: string, layerNames: [string]){

            var typeNamesQuery: any = this.getTypeNamesQuery(layerNames);

            // BBOX and FILTER queries are mutually exclusive, so must use CQL
            var bboxQuery: string = "&CQL_FILTER=BBOX(GEOM," + extent.west +","+ extent.south +","+ extent.east +","+ extent.north +")";

            var filterQuery: string = "";
            var filters: any = {}; // filterState.filters;
            var exportFormat: string  = "&outputFormat="+format;

            var query: string;

            var hasFilters: boolean = !isEmpty(filters);
            var filtersHasProperty: boolean = filters.hasOwnProperty("PROPERTY");
            var onlyHasPropertyFilter: boolean = (filtersHasProperty && (Object.keys(filters).length === 1)) ? true : false;


            function isEmpty(obj: any) {
                for(var prop in obj) {
                    if(obj.hasOwnProperty(prop))
                        return false;
                }
                return true;
            }

            // single feature/layer query with filters
            if(hasFilters && filtersHasProperty){

                this.propertyQuery = "%20AND%20PROPERTY='" + filters['PROPERTY'] +"'";
                if(!onlyHasPropertyFilter){
                    filterQuery = this.getFilters(filters);
                }
            }

            // multi feature/layer query with filters
            else if(hasFilters){

                this.propertyQuery = this.getPropertyQuery(properties);
                if(!onlyHasPropertyFilter){
                    filterQuery = this.getFilters(filters);
                }
            }

            // multi feature/layer query, no filters
            else {
                this.propertyQuery = this.getPropertyQuery(properties);
            }

            //ga('send', 'event', 'explorer-rock-properties', 'click', 'data export: '+ format);
            query =  this.baseUrl + typeNamesQuery + exportFormat + bboxQuery + filterQuery + this.propertyQuery;
            return query;
        }

        // create filter query for each of the selected attribute values
        // don't include PROPERTY here as we want to apply OR logic
        getFilters(filters: any){

            var filterString: string = "%20AND%20";

            // create filters string
            for(var property in filters){

                if(property !== "PROPERTY"){
                    filterString = filterString.concat(property + "='" + filters[property] +"'%20AND%20");
                }
            }
            // trim tailing AND
            filterString = filterString.substring(0, filterString.length -9);
            return filterString;
        }

        // build CQL query for properties
        getPropertyQuery(properties: any){

            var query: string = "%20AND%20(";
            for(var i = 0; i < properties.length; i++){
                query = query.concat("PROPERTY='" + properties[i] + "'%20OR%20");
            }
            // trim trailing OR, close bracket
            query = query.substring(0, query.length -8);
            query = query.concat(")");

            return query;
        }

        getTypeNamesQuery(layers: [string]){

            var query: string = "&typeName=";
            for(var i = 0; i < layers.length; i++){
                query = query.concat(layers[i] + ",");
            }
            query = query.substring(0, query.length - 1);
            return query;
        }
    }

    angular
        .module('explorer.rockproperties.queryexport', [])
        .factory("rocksQueryBuilderExport", [
            "$q",
            "$http",
            "$rootScope",
            "loadingSpinnerService",
            "rocksClipShipService",
            "rocksConfigService",
            "gwsUtilService",
            (
                $q: ng.IQService,
                $http: ng.IHttpService,
                $rootScope: ng.IRootScopeService,
                loadingSpinnerService: rpComponents.spinnerService.ILoadingSpinnerService,
                rocksClipShipService: rpComponents.clipShipService.IRocksClipShipService,
                rocksConfigService: rpComponents.config.IRocksConfigService,
                gwsUtilService: rpComponents.gwsUtilService.IGwsUtilService
            ) =>
                new rpComponents.queryBuilderExport.QueryBuilder(
                    $q,
                    $http,
                    $rootScope,
                    loadingSpinnerService,
                    rocksClipShipService,
                    rocksConfigService,
                    gwsUtilService
                )]);
}
