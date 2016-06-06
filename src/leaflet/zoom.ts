/// <reference path="../../typings/browser.d.ts" />

/**
 *
 * Handles the arbitrary 'zoom' levels/ranges that we will display different cluster granularities.
 *
 *
 */
module rpComponents.zoom {

    'use strict';

    export interface IZoomLevelService {
        map: L.Map;
        zoomLevels: any;
        nextPosition: any;
        previousPosition: any;
        defaultExtent: any;
        
        nextIndex: number;

        setActive(active:boolean): void;
        moveEndHandler(): void;
        getIndex(height: number): void;
        getViewExtent(offset: number): any;
    }

    export class ZoomLevelService implements IZoomLevelService {

        map: any;

        zoomLevels: any = [
            5000,
            10000,
            20000,
            30000,
            50000,
            80000,
            200000,
            1000000,
            1500000,
            2000000,
            4000000,
            6500000,

            // these's tiles are pretty broad
            8500000,
            10000000,
            15000000,
            100000000
        ];
        previousPosition: any;
        nextPosition: any;
        
        defaultExtent: any = {
            "west": 109,
            "south": -45,
            "east": 158,
            "north": -8
        };

        static $inject = [
            "$rootScope",
            "rocksConfigService"
        ];

        constructor(
            public $rootScope:ng.IRootScopeService,
            public rocksConfigService: rpComponents.config.IRocksConfigService
        ) {
            this.$rootScope.$on('rocks.config.ready', () => {
                this.map = this.rocksConfigService.map;
            });
        }
        
        public get nextIndex(): number {
           return this.getIndex(this.nextPosition.height);
        }
        public moveEndHandler = () => {
            this.nextPosition = this.map;
            // changed indexes or exceed threshold for pan, trigger recluster
            if((this.previousPosition.height > -1 && this.getIndex(this.previousPosition.height) != this.nextIndex) || 
               (Math.abs(this.nextPosition.latitude - this.previousPosition.latitude) > 0.01 / this.nextIndex ||
                Math.abs(this.nextPosition.longitude - this.previousPosition.longitude) > 0.01 / this.nextIndex) ||
                this.nextIndex == 16
            ) {
                this.$rootScope.$broadcast('rocks.clusters.update', this.nextIndex);
            }

            console.log("INDEX = " + this.nextIndex);

            this.previousPosition = this.nextPosition;
        };

        /**
         *
         * Get the lowest index the height fits into
         *
         * @param height
         * @returns {number}
         */
        public getIndex(height: number){
            for(var i = 0; i < this.zoomLevels.length; i++){
                if(height < this.zoomLevels[i]){
                    return this.zoomLevels.length - i;
                }
            }
            return this.zoomLevels.length - 1;
        }

        public setActive(active:boolean) {
           console.log("setActive called");
        }

        /**
         *
         * WKT? GeoJSON? - leave until approach is clearer.
         * TODO this is here temporarily, more thought needed re managing the buffered extent currently handled by minimap.
         *
         * @param offset
         * @returns {any}
         */
        public getViewExtent(offset: number){
           return 0; 
        }
    }

    angular
        .module('explorer.rockproperties.zoom', [])
        .factory("zoomLevelService", ["$rootScope", "rocksConfigService",
            (
                $rootScope:ng.IRootScopeService,
                rocksConfigService: rpComponents.config.IRocksConfigService
            ) => new rpComponents.zoom.ZoomLevelService($rootScope, rocksConfigService)]);

}
