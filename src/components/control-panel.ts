/// <reference path="../../typings/browser.d.ts" />
/// <reference path="../leaflet/clusters" />
/// <reference path="../leaflet/wms-inspector" />
/// <reference path="wms-points" />

module rpComponents.controlPanel {

    'use strict';

    export interface IRocksPanelCtrl {
        targetPanel: string;
        setTargetPanel(targetPanel: string): void;
    }
    export class RocksPanelCtrl implements IRocksPanelCtrl {

        targetPanel: string = '';
        static $inject = ["$scope", "rocksPanelService", "wmsInspectorService"];
        constructor(
            public $scope: ng.IScope,
            public rocksPanelService: rpComponents.controlPanel.IRocksPanelService,
            public wmsInspectorService: rpComponents.wmsInspectorService.IWmsInspectorService
        ){
            this.$scope.$on("rocks.accordion.update", (event: any, data: any) => {
                this.targetPanel = data;
            });
        }

        setTargetPanel(targetPanel: string): void {
            this.targetPanel = (this.targetPanel != targetPanel) ? targetPanel : "";
        }
    }

    export interface IRocksPanelService {
        map: any;
        clustersEnabled: boolean;
        pointsEnabled: boolean;
        toggleClusters(): void;
    }
    export class RocksPanelService implements IRocksPanelService {

        map: any;
        clustersEnabled: boolean = false;
        pointsEnabled: boolean = false;

        static $inject = [
            "$rootScope",
            "clusterService",
            "wmsPointsService",
            "rocksConfigService"
        ];
        constructor(
            public $rootScope: ng.IRootScopeService,
            public clusterService: rpComponents.clusterService.IClusterService,
            public wmsPointsService: rpComponents.pointsService.IWmsPointsService,
            public rocksConfigService: rpComponents.config.IRocksConfigService
        ){}

        /**
         *
         * The entry point for the component.
         *
         * @param map
         * @param clusterServiceUrl
         * @param wmsServiceUrl
         * @param pickEnabled
         */
        public init(map: any, config: any){
            this.map = map;
            this.rocksConfigService.setConfig(config, map);
        }

        public toggleClusters(): void {
            this.clustersEnabled = this.clusterService.toggleClusters();
        }

        public togglePoints(): void {
            this.pointsEnabled = this.wmsPointsService.togglePoints();
        }
    }

    angular
        .module('explorer.rockproperties.controlpanel', [])
        .factory("rocksPanelService", [
            "$rootScope", "clusterService", "wmsPointsService", "rocksConfigService",
            (
                $rootScope: ng.IRootScopeService,
                clusterService: rpComponents.clusterService.IClusterService,
                wmsPointsService: rpComponents.pointsService.IWmsPointsService,
                rocksConfigService: rpComponents.config.IRocksConfigService
            ) =>
                new rpComponents.controlPanel.RocksPanelService($rootScope, clusterService, wmsPointsService, rocksConfigService)
        ])
        .controller("rocksPanelCtrl", RocksPanelCtrl)
        .directive("rocksControlPanel", function(): ng.IDirective {
            return {
                templateUrl: 'rockprops/control-panel.html',
                controller:  RocksPanelCtrl,
                controllerAs: 'controlPanelVM'
            };
        });
}
