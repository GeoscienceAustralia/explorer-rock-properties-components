/// <reference path="../../typings/browser.d.ts" />
/// <reference path="../leaflet/clusters" />

declare var ga: any;

module rpComponents.filters {

    'use strict';

    export interface IRocksClusterFilterCtrl {}
    export class RocksClusterFilterCtrl implements IRocksClusterFilterCtrl {

        static $inject = ["$scope", "clusterService", "rocksPanelService", "rocksFiltersService"];
        constructor(
            public $scope: ng.IScope,
            public clusterService: rpComponents.clusterService.IClusterService,
            public rocksPanelService: rpComponents.controlPanel.IRocksPanelService,
            public rocksFiltersService: rpComponents.filters.IRocksFiltersService
        ){}
    }

    export interface IClusterFilterState {
        filterQuery: string;
    }

    export class ClusterFilterState implements IClusterFilterState {
        filterQuery: string = '';
    }

    export interface IRocksFiltersService {

        filters: any;
        exportProperties: any;
        clusterFilters: string;

        setAllExportSelected(selected: boolean): void;
    }

    export class RocksFiltersService implements IRocksFiltersService {

        filters: any;
        exportProperties: any;
        clusterFilters: any = {};

        $inject = [
            "$http",
            "$rootScope",
            "rocksConfigService",
            "clusterService",
            "clusterFilterState"
        ];

        constructor(
            public $http: ng.IHttpService,
            public $rootScope: ng.IRootScopeService,
            public rocksConfigService: rpComponents.config.IRocksConfigService,
            public clusterService: rpComponents.clusterService.IClusterService,
            public clusterFilterState: rpComponents.filters.IClusterFilterState
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

        public applyFilters(): void {
            this.clusterFilterState.filterQuery = this.buildFilterQuery();
            this.clusterService.reCluster();

            ga('send', 'event', 'explorer-rock-properties', 'click', 'cluster filters applied');
        }

        public buildFilterQuery(): string {

            var query: string[] = [];

            for(var i = 0; i < this.filters.length; i++){
                if(this.filters[i].hasOwnProperty('ClusterOption') && this.filters[i].ClusterOption){
                    query.push('filter='+ encodeURIComponent(this.filters[i].filterType +'='+ this.filters[i].ClusterOption));
                }
            }

            return "&" + query.join("&");
        }

        public clearFilters(): void {

            for(var i = 0; i < this.filters.length; i++){
                if(this.filters[i].hasOwnProperty('ClusterOption')){
                    this.filters[i].ClusterOption = false;
                }
            }

            this.clusterFilterState.filterQuery = "";
            this.clusterService.reCluster();
        }
    }

    angular
        .module('explorer.rockproperties.clusterfilters', [])
        .controller("rocksClusterFilterCtrl", RocksClusterFilterCtrl)
        .directive("rocksClusterFilters", function(): ng.IDirective {
            return {
                templateUrl: 'rockprops/cluster-filters.html',
                controller:  RocksClusterFilterCtrl,
                controllerAs: 'rocksClusterFilterVM'
            };
        })
        .factory("rocksFiltersService", [
            "$http",
            "$rootScope",
            "rocksConfigService",
            "clusterService",
            "clusterFilterState",
            (
                $http: ng.IHttpService,
                $rootScope: ng.IRootScopeService,
                rocksConfigService: rpComponents.config.IRocksConfigService,
                clusterService: rpComponents.clusterService.IClusterService,
                clusterFilterState: rpComponents.filters.IClusterFilterState
            ) =>
                new rpComponents.filters.RocksFiltersService(
                    $http,
                    $rootScope,
                    rocksConfigService,
                    clusterService,
                    clusterFilterState
                )]
        )
        .factory("clusterFilterState", [() => new rpComponents.filters.ClusterFilterState()]);
}
