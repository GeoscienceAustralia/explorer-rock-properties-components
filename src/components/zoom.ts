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
        setActive(active:boolean): void;
        moveEndHandler(): void;
    }

    export class ZoomLevelService implements IZoomLevelService {

        viewer:any;

        static $inject = [
            "$rootScope"
        ];

        constructor(public $rootScope:ng.IRootScopeService) {}

        /**
         * TS syntax to so we don't lose this scope for event listener
         * https://github.com/Microsoft/TypeScript/wiki/'this'-in-TypeScript
         */
        public moveEndHandler = () => {
            console.log(Cesium.Ellipsoid.WGS84.cartesianToCartographic(this.viewer.camera.position).height);
        };

        public setActive(active:boolean) {

            if(active) {
                this.viewer.camera.moveEnd.addEventListener(this.moveEndHandler);
            }
            else {
                this.viewer.camera.moveEnd.removeEventListener(this.moveEndHandler);
            }

        }


    }

    // ng register
    angular
        .module('explorer.rockproperties.zoom', [])
        .factory("zoomLevelService", ["$rootScope",
            ($rootScope:ng.IRootScopeService) => new rpComponents.zoom.ZoomLevelService($rootScope)]);

}
