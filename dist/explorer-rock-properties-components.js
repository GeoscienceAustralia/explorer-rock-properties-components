/// <reference path="../../typings/tsd.d.ts" />
/**
 *
 *   Initial shell for single cluster
 *
 */
var rpComponents;
(function (rpComponents) {
    var cluster;
    (function (cluster) {
        'use strict';
        var Cluster = (function () {
            function Cluster(count, lat, lon, elev, lithologyGroup, property, provinceName, sampleType, stratigraphicUnitName) {
                this.count = count;
                this.lat = lat;
                this.lon = lon;
                this.elev = elev;
                this.lithologyGroup = lithologyGroup;
                this.property = property;
                this.provinceName = provinceName;
                this.sampleType = sampleType;
                this.stratigraphicUnitName = stratigraphicUnitName;
            }
            Cluster.$inject = [
                "count",
                "lat",
                "lon",
                "elev",
                "lithologyGroup",
                "property",
                "provinceName",
                "sampleType",
                "stratigraphicUnitName"
            ];
            return Cluster;
        })();
        cluster.Cluster = Cluster;
    })(cluster = rpComponents.cluster || (rpComponents.cluster = {}));
})(rpComponents || (rpComponents = {}));
/// <reference path="../../typings/tsd.d.ts" />
var rpComponents;
(function (rpComponents) {
    var clusterService;
    (function (clusterService) {
        'use strict';
        var ClusterService = (function () {
            function ClusterService($http, $rootScope, zoomLevelService) {
                var _this = this;
                this.$http = $http;
                this.$rootScope = $rootScope;
                this.zoomLevelService = zoomLevelService;
                /**
                 *
                 * We get a performance benefit when we use fewer primitives/collections to draw multiple static geometries.
                 *
                 */
                this.reCluster = function () {
                    var sphereInstances = [];
                    var labelCollection = new Cesium.LabelCollection();
                    _this.getClusters().then(function (response) {
                        if (response.data) {
                            var clusters = response.data;
                            for (var i = 0; i < clusters.length; i++) {
                                sphereInstances.push(_this.buildSphereInstance(clusters[i]));
                                labelCollection.add(_this.buildLabel(clusters[i]));
                            }
                            _this.drawClusters(sphereInstances, labelCollection);
                        }
                        else {
                            console.log("got no clusters");
                        }
                    });
                };
            }
            ClusterService.prototype.init = function (viewer, serviceUrl) {
                var _this = this;
                this.viewer = viewer;
                this.zoomLevelService.viewer = viewer;
                this.serviceUrl = serviceUrl;
                this.$rootScope.$on('rocks.clusters.update', function () {
                    _this.reCluster();
                });
            };
            ClusterService.prototype.toggleClusters = function () {
                var _this = this;
                if (this.clustersCollection) {
                    this.clustersCollection.show = !this.clustersCollection.show;
                    this.zoomLevelService.setActive(this.clustersCollection.show);
                    this.reCluster();
                }
                else {
                    this.clustersCollection = new Cesium.PrimitiveCollection();
                    this.viewer.scene.primitives.add(this.clustersCollection);
                    this.zoomLevelService.setActive(true);
                    this.reCluster();
                    var handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
                    handler.setInputAction(function (movement) {
                        var pick = _this.viewer.scene.pick(movement.position);
                        //if (Cesium.defined(pick) && (pick.id === 'hello id')) {
                        if (Cesium.defined(pick)) {
                            console.log('id: ');
                            console.log(pick.id);
                        }
                    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
                }
            };
            /**
             *
             * This will be extended to use extent + zoom/index and filters on cluster service
             * TODO where will we get our extent - shouldn't depend on minimap
             * TODO filters
             *
             * @returns {IHttpPromise<T>}
             */
            ClusterService.prototype.getClusters = function () {
                // debug
                return this.$http({
                    method: 'GET',
                    url: this.serviceUrl + this.zoomLevelService.nextIndex + '.json',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: {
                        heightIndex: this.zoomLevelService.nextIndex,
                        extent: this.zoomLevelService.getViewExtent(100)
                    }
                });
            };
            /**
             *
             *
             *
             * @param cluster
             */
            ClusterService.prototype.getClusterInfo = function (cluster) {
                console.log("TODO query service for cluster info for:");
                console.log(cluster);
            };
            ClusterService.prototype.drawClusters = function (sphereInstances, labelCollection) {
                this.clustersCollection.removeAll();
                this.clustersCollection.add(new Cesium.Primitive({
                    geometryInstances: sphereInstances,
                    appearance: new Cesium.PerInstanceColorAppearance({
                        translucent: true,
                        closed: true
                    })
                }));
                this.clustersCollection.add(labelCollection);
            };
            ClusterService.prototype.buildSphereInstance = function (cluster) {
                var clusterProps = this.computeClusterAttributes(cluster.count);
                // Sphere geometries are initially centered on the origin.
                // We can use a model matrix to position the sphere on the globe surface.
                var positionOnEllipsoid = Cesium.Cartesian3.fromDegrees(cluster.lon, cluster.lat);
                var modelMatrix = Cesium.Matrix4.multiplyByTranslation(Cesium.Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid), new Cesium.Cartesian3(cluster.lon, cluster.lat, clusterProps.size), new Cesium.Matrix4());
                // Create a sphere geometry.
                var sphereGeometry = new Cesium.SphereGeometry({
                    vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
                    radius: clusterProps.size
                });
                // Create a geometry instance using the geometry and model matrix created above.
                var sphereInstance = new Cesium.GeometryInstance({
                    geometry: sphereGeometry,
                    modelMatrix: modelMatrix,
                    vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                    attributes: {
                        color: Cesium.ColorGeometryInstanceAttribute.fromColor(clusterProps.color)
                    },
                    id: cluster // for picking
                });
                return sphereInstance;
            };
            ClusterService.prototype.buildLabel = function (cluster) {
                var clusterProps = this.computeClusterAttributes(cluster.count);
                return {
                    position: Cesium.Cartesian3.fromDegrees(cluster.lon, cluster.lat, 20 + (clusterProps.size * 2)),
                    text: cluster.count.toString(),
                    fillColor: Cesium.Color.BLACK,
                    outlineColor: Cesium.Color.RED,
                    font: '30px arial, sans-serif',
                    horizontalOrigin: Cesium.HorizontalOrigin.CENTER //,
                };
            };
            ClusterService.prototype.computeClusterAttributes = function (count) {
                if (count < 10) {
                    return { size: 10000 * this.zoomLevelService.nextIndex, color: Cesium.Color.fromCssColorString('#4781cd').withAlpha(0.5) };
                }
                else if (count >= 10 && count < 1000) {
                    return { size: 10000 * this.zoomLevelService.nextIndex, color: Cesium.Color.fromCssColorString('#0fc70e').withAlpha(0.5) };
                }
                else {
                    return { size: 10000 * this.zoomLevelService.nextIndex, color: Cesium.Color.fromCssColorString('#ff0000').withAlpha(0.5) };
                }
            };
            ClusterService.$inject = [
                "$http",
                "$rootScope",
                "zoomLevelService"
            ];
            return ClusterService;
        })();
        clusterService.ClusterService = ClusterService;
        // ng register
        angular
            .module('explorer.rockproperties.clusters', [])
            .factory("clusterService", ["$http", "$rootScope", "zoomLevelService",
            function ($http, $rootScope, zoomLevelService) {
                return new rpComponents.clusterService.ClusterService($http, $rootScope, zoomLevelService);
            }]);
    })(clusterService = rpComponents.clusterService || (rpComponents.clusterService = {}));
})(rpComponents || (rpComponents = {}));
/// <reference path="../../typings/tsd.d.ts" />
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
        var ZoomLevelService = (function () {
            function ZoomLevelService($rootScope) {
                var _this = this;
                this.$rootScope = $rootScope;
                // Arbitrary height indexes: < 5000 is 0, > 500 && < 10000 is 1 etc.
                this.zoomLevels = [5000, 10000, 20000, 40000, 750000, 1500000, 2500000, 3500000, 5500000, 6500000, 8000000];
                this.defaultExtent = {
                    "west": 109,
                    "south": -45,
                    "east": 158,
                    "north": -8
                };
                this.moveEndHandler = function () {
                    _this.nextIndex = _this.getIndex(Cesium.Ellipsoid.WGS84.cartesianToCartographic(_this.viewer.camera.position).height);
                    // changed indexes, trigger recluster
                    if (_this.previousIndex > -1 && _this.previousIndex != _this.nextIndex) {
                        _this.$rootScope.$broadcast('rocks.clusters.update', _this.nextIndex);
                    }
                    _this.previousIndex = _this.nextIndex;
                };
            }
            /**
             *
             * Get the lowest index the height fits into
             *
             * @param height
             * @returns {number}
             */
            ZoomLevelService.prototype.getIndex = function (height) {
                for (var i = 0; i < this.zoomLevels.length; i++) {
                    if (height < this.zoomLevels[i]) {
                        return i;
                    }
                }
                return this.zoomLevels.length - 1;
            };
            ZoomLevelService.prototype.setActive = function (active) {
                if (active) {
                    // TODO extent
                    this.previousIndex = this.getIndex(Cesium.Ellipsoid.WGS84.cartesianToCartographic(this.viewer.camera.position).height);
                    this.nextIndex = this.previousIndex;
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
            ZoomLevelService.prototype.getViewExtent = function (offset) {
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
            ZoomLevelService.$inject = [
                "$rootScope"
            ];
            return ZoomLevelService;
        })();
        zoom.ZoomLevelService = ZoomLevelService;
        // ng register
        angular
            .module('explorer.rockproperties.zoom', [])
            .factory("zoomLevelService", ["$rootScope",
            function ($rootScope) { return new rpComponents.zoom.ZoomLevelService($rootScope); }]);
    })(zoom = rpComponents.zoom || (rpComponents.zoom = {}));
})(rpComponents || (rpComponents = {}));
