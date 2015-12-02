/// <reference path="../../typings/tsd.d.ts" />

declare var Cesium: any;

module rpComponents.controlPanel {

    'use strict';

    export interface IRocksPanelCtrl {
        targetPanel: string;
        setTargetPanel(targetPanel: string): void;
    }
    export class RocksPanelCtrl implements IRocksPanelCtrl {

        targetPanel: string = '';

        static $inject = ["$scope", "rocksPanelService"];
        constructor(
            public $scope: ng.IScope,
            public rocksPanelService: rpComponents.controlPanel.IRocksPanelService
        ){}

        setTargetPanel(targetPanel: string): void {
            this.targetPanel = (this.targetPanel != targetPanel) ? targetPanel : "";
        }
    }

    export interface IRocksPanelService {

        viewer: any;
        rocksPanelActive: boolean;
        clustersEnabled: boolean;
        pointsEnabled: boolean;
        toggleRocksPanel(): void;
        enableRocksPanel(enable: boolean): void;
        toggleClusters(): void;
    }
    export class RocksPanelService implements IRocksPanelService {

        viewer: any;
        rocksPanelActive: boolean = false;
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
         * @param viewer
         * @param clusterServiceUrl
         * @param wmsServiceUrl
         * @param pickEnabled
         */
        public init(viewer: any, config: any){

            this.viewer = viewer;
            this.rocksConfigService.setConfig(config);
            this.clusterService.init(viewer);
            this.wmsPointsService.init(viewer);
        }

        public toggleRocksPanel(): void {
            this.rocksPanelActive = !this.rocksPanelActive;

            // TODO make sure clusters init on first open..


            //if(!this.rocksPanelActive){
            //    console.log("broadcasting unlinked");
            //    this.$rootScope.$broadcast('unlinked');
            //}
        }

        public enableRocksPanel(enable: boolean): void {

            this.rocksPanelActive = enable;
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
