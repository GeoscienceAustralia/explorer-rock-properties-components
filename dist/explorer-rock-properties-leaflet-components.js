/// <reference path="../../typings/browser.d.ts" />
var rpComponents;
(function (rpComponents) {
    var config;
    (function (config_1) {
        'use strict';
        var RocksConfigService = (function () {
            function RocksConfigService($rootScope) {
                this.$rootScope = $rootScope;
            }
            RocksConfigService.prototype.setConfig = function (config, viewer) {
                this.config = config;
                this.viewer = viewer;
                this.$rootScope.$broadcast("rocks.config.ready");
            };
            RocksConfigService.$inject = [
                "$rootScope"
            ];
            return RocksConfigService;
        }());
        config_1.RocksConfigService = RocksConfigService;
        angular
            .module('explorer.rockproperties.config', [])
            .factory("rocksConfigService", ["$rootScope",
            function ($rootScope) {
                return new rpComponents.config.RocksConfigService($rootScope);
            }]);
    })(config = rpComponents.config || (rpComponents.config = {}));
})(rpComponents || (rpComponents = {}));
/// <reference path="../../typings/browser.d.ts" />
/// <reference path="config.ts" />
/**
 *
 * Handles the arbitrary 'zoom' levels/ranges that we will display different cluster granularities.
 *
 *
 */
var rpComponents;
(function (rpComponents) {
    var zoom;
    (function (zoom) {
        'use strict';
    })(zoom = rpComponents.zoom || (rpComponents.zoom = {}));
})(rpComponents || (rpComponents = {}));
/// <reference path="../../typings/browser.d.ts" />
/// <reference path="../components/zoom" />
/**
 *
 * Handles the arbitrary 'zoom' levels/ranges that we will display different cluster granularities.
 *
 *
 */
var rpComponents;
(function (rpComponents) {
    var zoom;
    (function (zoom) {
        'use strict';
        var LeafletZoomLevelService = (function () {
            function LeafletZoomLevelService($rootScope, rocksConfigService) {
                var _this = this;
                this.$rootScope = $rootScope;
                this.rocksConfigService = rocksConfigService;
                this.zoomLevels = [
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
                this.defaultExtent = {
                    "west": 109,
                    "south": -45,
                    "east": 158,
                    "north": -8
                };
                this.moveEndHandler = function () {
                    _this.nextPosition = Cesium.Ellipsoid.WGS84.cartesianToCartographic(_this.viewer.camera.position);
                    // changed indexes or exceed threshold for pan, trigger recluster
                    if ((_this.previousPosition.height > -1 && _this.getIndex(_this.previousPosition.height) != _this.nextIndex) ||
                        (Math.abs(_this.nextPosition.latitude - _this.previousPosition.latitude) > 0.01 / _this.nextIndex ||
                            Math.abs(_this.nextPosition.longitude - _this.previousPosition.longitude) > 0.01 / _this.nextIndex) ||
                        _this.nextIndex == 16) {
                        _this.$rootScope.$broadcast('rocks.clusters.update', _this.nextIndex);
                    }
                    console.log("INDEX = " + _this.nextIndex + " HEIGHT = " + Cesium.Ellipsoid.WGS84.cartesianToCartographic(_this.viewer.camera.position).height);
                    _this.previousPosition = _this.nextPosition;
                };
                this.$rootScope.$on('rocks.config.ready', function () {
                    _this.viewer = _this.rocksConfigService.viewer;
                });
            }
            Object.defineProperty(LeafletZoomLevelService.prototype, "nextIndex", {
                get: function () {
                    return this.getIndex(this.nextPosition.height);
                },
                enumerable: true,
                configurable: true
            });
            /**
             *
             * Get the lowest index the height fits into
             *
             * @param height
             * @returns {number}
             */
            LeafletZoomLevelService.prototype.getIndex = function (height) {
                for (var i = 0; i < this.zoomLevels.length; i++) {
                    if (height < this.zoomLevels[i]) {
                        return this.zoomLevels.length - i;
                    }
                }
                return this.zoomLevels.length - 1;
            };
            LeafletZoomLevelService.prototype.setActive = function (active) {
                if (active) {
                    // TODO extent
                    this.nextPosition = this.previousPosition = Cesium.Ellipsoid.WGS84.cartesianToCartographic(this.viewer.camera.position);
                    this.viewer.camera.moveEnd.addEventListener(this.moveEndHandler);
                }
                else {
                    this.viewer.camera.moveEnd.removeEventListener(this.moveEndHandler);
                }
            };
            /**
             *
             * WKT? GeoJSON? - leave until approach is clearer.
             * TODO this is here temporarily, more thought needed re managing the buffered extent currently handled by minimap.
             *
             * @param offset
             * @returns {any}
             */
            LeafletZoomLevelService.prototype.getViewExtent = function (offset) {
                var ellipsoid = Cesium.Ellipsoid.WGS84;
                var pixelRatio = window.devicePixelRatio || 1;
                var c2 = new Cesium.Cartesian2(-offset, -offset);
                var leftTop = this.viewer.scene.camera.pickEllipsoid(c2, ellipsoid);
                c2 = new Cesium.Cartesian2((this.viewer.scene.canvas.width / pixelRatio) + offset, (this.viewer.scene.canvas.height / pixelRatio) + offset);
                var rightDown = this.viewer.scene.camera.pickEllipsoid(c2, ellipsoid);
                if (leftTop != null && rightDown != null) {
                    leftTop = ellipsoid.cartesianToCartographic(leftTop);
                    rightDown = ellipsoid.cartesianToCartographic(rightDown);
                    // sometimes at a certain camera pos/zoom, the canvas corners effectively disappear over
                    // the horizon and wrap around the globe, while still passing as a valid rectangle
                    if (leftTop.longitude > rightDown.longitude) {
                        return this.defaultExtent;
                    }
                    return {
                        west: Cesium.Math.toDegrees(leftTop.longitude),
                        south: Cesium.Math.toDegrees(rightDown.latitude),
                        east: Cesium.Math.toDegrees(rightDown.longitude),
                        north: Cesium.Math.toDegrees(leftTop.latitude)
                    };
                }
                else {
                    return this.defaultExtent;
                }
            };
            LeafletZoomLevelService.$inject = [
                "$rootScope",
                "rocksConfigService"
            ];
            return LeafletZoomLevelService;
        }());
        zoom.LeafletZoomLevelService = LeafletZoomLevelService;
        angular
            .module('explorer.rockproperties.zoom', [])
            .factory("zoomLevelService", ["$rootScope", "rocksConfigService",
            function ($rootScope, rocksConfigService) {
                return new rpComponents.zoom.LeafletZoomLevelService($rootScope, rocksConfigService);
            }]);
    })(zoom = rpComponents.zoom || (rpComponents.zoom = {}));
})(rpComponents || (rpComponents = {}));
