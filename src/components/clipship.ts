/// <reference path="../../typings/browser.d.ts" />
/// <reference path="query-builder-export" />
/// <reference path="cluster-filters" />
/// <reference path="control-panel" />

module rpComponents.clipShipService {

    'use strict';

    export interface IRocksClipShipCtrl {
        startClipShip(): void;
    }
    export class RocksClipShipCtrl implements IRocksClipShipCtrl {

        static $inject = [
            "$scope",
            "$timeout",
            "rocksClipShipService",
            "rocksPanelService",
            "rocksFiltersService",
            "rocksQueryBuilderExport"
        ];
        constructor(
            public $scope: ng.IScope,
            public $timeout: ng.ITimeoutService,
            public rocksClipShipService: rpComponents.clipShipService.IRocksClipShipService,
            public rocksPanelService: rpComponents.controlPanel.IRocksPanelService,
            public rocksFiltersService: rpComponents.filters.IRocksFiltersService,
            public rocksQueryBuilderExport: rpComponents.queryBuilderExport.IQueryBuilder
        ){}

        startClipShip(): void {

            this.$timeout(() => {
                this.rocksClipShipService.step = 'download';
                this.rocksQueryBuilderExport.startClipShip(
                    this.rocksFiltersService.exportProperties.filterOptions,
                    this.rocksClipShipService.targetFormat,
                    this.rocksClipShipService.targetExtent
                );
            });
        }
    }

    export interface IRocksClipShipService {
        step: string;
        isDrawing: boolean;
        exportFormats: [string];
        targetExtent: any;
        targetFormat: string;
        startDraw(): void;
        openGeoserver(): void;
    }

    export class RocksClipShipService implements IRocksClipShipService {

        step: string = "startDraw";
        isDrawing: boolean = false;
        exportFormats: [string];
        targetExtent: any;
        targetFormat: string;

        $inject = [
            "$timeout",
            "$rootScope",
            "rocksFiltersService",
            "rocksConfigService"
        ];

        constructor(
            public $timeout: ng.ITimeoutService,
            public $rootScope: ng.IRootScopeService,
            public rocksFiltersService: rpComponents.filters.IRocksFiltersService,
            public rocksConfigService: rpComponents.config.IRocksConfigService
        ) {

            this.$rootScope.$on("rocks.config.ready", () => {
                this.exportFormats = this.rocksConfigService.config.geoserverWfsExportFormats;
            });

            this.$rootScope.$on("rocks.extent.ready", (event: any, data: any) => {
               this.$timeout(() => {
                  this.step = "selectFeatures";
                  this.targetExtent = data;
               });
            });
        }

        /**
         * broadcast event to trigger draw, and return extent
         */
        startDraw(): void {
            this.isDrawing = true;
            this.$rootScope.$broadcast("draw.extent.start", "rocks.extent.ready");
        }

        openGeoserver(): void{
            var win = window.open(this.rocksConfigService.config.geoserverDashboardUrl, '_blank');
            if(win){
                win.focus();
            }
        }

        updateExportFormat(format: string): void {
            this.targetFormat = format;
        }
    }

    angular
        .module('explorer.rockproperties.clipship', [])
        .factory("rocksClipShipService", ["$timeout", "$rootScope", "rocksFiltersService", "rocksConfigService",
            (
                $timeout: ng.ITimeoutService,
                $rootScope: ng.IRootScopeService,
                rocksFiltersService: rpComponents.filters.IRocksFiltersService,
                rocksConfigService: rpComponents.config.IRocksConfigService
            ) =>
                new rpComponents.clipShipService.RocksClipShipService(
                    $timeout,
                    $rootScope,
                    rocksFiltersService,
                    rocksConfigService
            )
        ])
        .controller("rocksClipShipCtrl", RocksClipShipCtrl)
        .directive("rocksClipShip", function(): ng.IDirective {
            return {
                templateUrl: 'rockprops/clip-ship.html',
                controller:  RocksClipShipCtrl,
                controllerAs: 'rocksClipShipVM'
            };
        })
        .filter('noClipSelected', [($filter: ng.IFilterService) => {
            return (features: any) => {

                if(!features) return;
                for(var i = 0; i < features.length; i++){
                    if(features[i].isSelected) return false;
                }
                return true;
            };
        }]);
}
