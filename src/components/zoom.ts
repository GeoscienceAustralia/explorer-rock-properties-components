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
        nextIndex: number;
        previousIndex: number;
        defaultExtent: any;

        setActive(active:boolean): void;
        moveEndHandler(): void;
        getIndex(height: number): void;
        getViewExtent(offset: number): any;
    }

    export class ZoomLevelService implements IZoomLevelService {

        viewer: any;

        // Arbitrary height indexes: < 5000 is 0, > 5000 && < 10000 is 1 etc.
        zoomLevels: any = [
            1000,
            2000,
            5000,
            20000,
            50000,
            100000,
            500000,
            1000000,
            3000000,
            5000000,
            7500000,


            // these's tile may be a broad to be meaningful
            8400000,
            8500000,
            9000000,
            9500000,
            10000000
        ];
        nextIndex: number;
        previousIndex: number;
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
        public moveEndHandler = () => {

            this.nextIndex = this.getIndex(Cesium.Ellipsoid.WGS84.cartesianToCartographic(this.viewer.camera.position).height);

            // changed indexes, trigger recluster
            if(this.previousIndex > -1 && this.previousIndex != this.nextIndex){
                this.$rootScope.$broadcast('rocks.clusters.update', this.nextIndex);
            }

            console.log("HEIGHT");
            console.log(Cesium.Ellipsoid.WGS84.cartesianToCartographic(this.viewer.camera.position).height);

            this.previousIndex = this.nextIndex;
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
                this.previousIndex = this.getIndex(Cesium.Ellipsoid.WGS84.cartesianToCartographic(this.viewer.camera.position).height);
                this.nextIndex = this.previousIndex;

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
