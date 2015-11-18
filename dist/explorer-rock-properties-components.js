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
                this.$http = $http;
                this.$rootScope = $rootScope;
                this.zoomLevelService = zoomLevelService;
            }
            ClusterService.prototype.init = function (viewer, serviceUrl) {
                this.viewer = viewer;
                this.zoomLevelService.viewer = viewer;
                this.serviceUrl = serviceUrl;
            };
            ClusterService.prototype.toggleClusters = function () {
                if (this.clustersCollection) {
                    this.clustersCollection.show = !this.clustersCollection.show;
                    this.zoomLevelService.setActive(this.clustersCollection.show);
                }
                else {
                    this.clustersCollection = new Cesium.PrimitiveCollection();
                    this.viewer.scene.primitives.add(this.clustersCollection);
                    this.addClusters();
                    this.zoomLevelService.setActive(true);
                }
            };
            /**
             *
             * This will be extended to use extent + zoom on cluster service
             *
             * @returns {IHttpPromise<T>}
             */
            ClusterService.prototype.getClusters = function () {
                return this.$http.get(this.serviceUrl + 'clusters');
            };
            /**
             *
             * We get a performance benefit when we use fewer primitives/collections to draw multiple static geometries.
             *
             */
            ClusterService.prototype.addClusters = function () {
                var _this = this;
                var sphereInstances = [];
                var labelCollection = new Cesium.LabelCollection();
                this.getClusters().then(function (response) {
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
            ClusterService.prototype.drawClusters = function (sphereInstances, labelCollection) {
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
                var modelMatrix = Cesium.Matrix4.multiplyByTranslation(Cesium.Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid), new Cesium.Cartesian3(cluster.lon, cluster.lat, cluster.elev + clusterProps.size), new Cesium.Matrix4());
                // Create a sphere geometry.
                var sphereGeometry = new Cesium.SphereGeometry({
                    vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
                    radius: clusterProps.size
                });
                // Create a geometry instance using the geometry and model matrix created above.
                var sphereInstance = new Cesium.GeometryInstance({
                    geometry: sphereGeometry,
                    modelMatrix: modelMatrix,
                    attributes: {
                        color: Cesium.ColorGeometryInstanceAttribute.fromColor(clusterProps.color)
                    }
                });
                return sphereInstance;
            };
            ClusterService.prototype.buildLabel = function (cluster) {
                var clusterProps = this.computeClusterAttributes(cluster.count);
                return {
                    position: Cesium.Cartesian3.fromDegrees(cluster.lon, cluster.lat, cluster.elev + 20 + (clusterProps.size * 2)),
                    text: cluster.count.toString(),
                    fillColor: Cesium.Color.BLACK,
                    outlineColor: Cesium.Color.RED,
                    font: '30px arial, sans-serif',
                    horizontalOrigin: Cesium.HorizontalOrigin.CENTER //,
                };
            };
            ClusterService.prototype.computeClusterAttributes = function (count) {
                if (count < 10) {
                    return { size: 60000, color: Cesium.Color.fromCssColorString('#4781cd').withAlpha(0.5) };
                }
                else if (count >= 10 && count < 250) {
                    return { size: 80000, color: Cesium.Color.fromCssColorString('#0fc70e').withAlpha(0.5) };
                }
                else {
                    return { size: 90000, color: Cesium.Color.fromCssColorString('#ff0000').withAlpha(0.5) };
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
                /**
                 * TS syntax to so we don't lose this scope for event listener
                 * https://github.com/Microsoft/TypeScript/wiki/'this'-in-TypeScript
                 */
                this.moveEndHandler = function () {
                    console.log(Cesium.Ellipsoid.WGS84.cartesianToCartographic(_this.viewer.camera.position).height);
                };
            }
            ZoomLevelService.prototype.setActive = function (active) {
                if (active) {
                    this.viewer.camera.moveEnd.addEventListener(this.moveEndHandler);
                }
                else {
                    this.viewer.camera.moveEnd.removeEventListener(this.moveEndHandler);
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
