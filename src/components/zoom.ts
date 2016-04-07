/// <reference path="../../typings/tsd.d.ts" />

declare var Cesium: any;

/**
 *
 * Handles the arbitrary 'zoom' levels/ranges that we will display different cluster granularities.
 *
 *
 */
module rpComponents.zoom {

    'use strict';

    export interface IZoomLevelService {
        viewer: any;
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

        viewer: any;

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
                this.viewer = this.rocksConfigService.viewer;
            });
        }
        
        public get nextIndex(): number {
           return this.getIndex(this.nextPosition.height);
        }
        public moveEndHandler = () => {
            this.nextPosition = Cesium.Ellipsoid.WGS84.cartesianToCartographic(this.viewer.camera.position);
            // changed indexes or exceed threshold for pan, trigger recluster
            if((this.previousPosition.height > -1 && this.getIndex(this.previousPosition.height) != this.nextIndex) || 
               (Math.abs(this.nextPosition.latitude - this.previousPosition.latitude) > 0.01 / this.nextIndex ||
                Math.abs(this.nextPosition.longitude - this.previousPosition.longitude) > 0.01 / this.nextIndex) ||
                this.nextIndex == 16
            ) {
                this.$rootScope.$broadcast('rocks.clusters.update', this.nextIndex);
            }

            console.log("INDEX = " + this.nextIndex + " HEIGHT = " + Cesium.Ellipsoid.WGS84.cartesianToCartographic(this.viewer.camera.position).height);

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
            if(active) {
                // TODO extent
                this.nextPosition = this.previousPosition = Cesium.Ellipsoid.WGS84.cartesianToCartographic(this.viewer.camera.position);
                this.viewer.camera.moveEnd.addEventListener(this.moveEndHandler);
            }
            else {
                this.viewer.camera.moveEnd.removeEventListener(this.moveEndHandler);
            }
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

            var ellipsoid = Cesium.Ellipsoid.WGS84;
            var pixelRatio = window.devicePixelRatio || 1;

            var c2 = new Cesium.Cartesian2(-offset, -offset);
            var leftTop = this.viewer.scene.camera.pickEllipsoid(c2, ellipsoid);

            c2 = new Cesium.Cartesian2(
                (this.viewer.scene.canvas.width / pixelRatio) + offset,
                (this.viewer.scene.canvas.height / pixelRatio) + offset
            );

            var rightDown = this.viewer.scene.camera.pickEllipsoid(c2, ellipsoid);
            if(leftTop != null && rightDown != null){

                leftTop = ellipsoid.cartesianToCartographic(leftTop);
                rightDown = ellipsoid.cartesianToCartographic(rightDown);

                // sometimes at a certain camera pos/zoom, the canvas corners effectively disappear over
                // the horizon and wrap around the globe, while still passing as a valid rectangle
                if(leftTop.longitude > rightDown.longitude){
                    return this.defaultExtent;
                }

                return {
                    west: Cesium.Math.toDegrees(leftTop.longitude),
                    south: Cesium.Math.toDegrees(rightDown.latitude),
                    east: Cesium.Math.toDegrees(rightDown.longitude),
                    north: Cesium.Math.toDegrees(leftTop.latitude)
                };
            }

            // The sky is visible, fallback to default
            else {
                return this.defaultExtent;
            }
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
