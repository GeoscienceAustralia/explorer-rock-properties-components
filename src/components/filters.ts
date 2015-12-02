/// <reference path="../../typings/tsd.d.ts" />

module rpComponents.filters {

    'use strict';

    export interface IRocksFiltersService {
        filters: any;
        exportProperties: any;
        setAllExportSelected(selected: boolean): void;
    }

    export class RocksFiltersService implements IRocksFiltersService {

        filters: any;
        exportProperties: any;

        $inject = [
            "$http",
            "$rootScope",
            "rocksConfigService"
        ];

        constructor(
            public $http: ng.IHttpService,
            public $rootScope: ng.IRootScopeService,
            public rocksConfigService: rpComponents.config.IRocksConfigService
        ) {
            // load filter data
            this.$rootScope.$on("rocks.config.ready", () => {

                $http.get(this.rocksConfigService.config.filterNamesServiceUrl).then((response: any) => {

                    this.filters = response.data;
                    for(var i = 0; i < this.filters.length; i++){
                        if(this.filters[i].filterType == "PROPERTY"){

                            // set up properties array with flag for export
                            var propertyOptions = angular.copy(this.filters[i].filterOptions);
                            for(var j = 0; j < propertyOptions.length; j++){
                                propertyOptions[j] = {
                                    name: propertyOptions[j],
                                    isSelected: false
                                }
                            }
                            var properties: any = angular.copy(this.filters[i]);
                            properties.filterOptions = propertyOptions;
                            this.exportProperties = properties;
                        }
                    }

                }), (response: any) => {
                    console.log("Failed to get rock props filters");
                    console.log(response);
                };
            });


        }

        public setAllExportSelected(selected: boolean){
            for(var i = 0; i < this.exportProperties.filterOptions.length; i++){
                this.exportProperties.filterOptions[i].isSelected = selected;
            }
        }
    }

    angular
        .module('explorer.rockproperties.filters', [])
        .factory("rocksFiltersService", ["$http", "$rootScope", "rocksConfigService",
            (
                $http: ng.IHttpService,
                $rootScope: ng.IRootScopeService,
                rocksConfigService: rpComponents.config.IRocksConfigService) =>
                new rpComponents.filters.RocksFiltersService($http, $rootScope, rocksConfigService)]);
}
