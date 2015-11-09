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
            function ClusterService($http) {
                this.$http = $http;
            }
            ClusterService.prototype.init = function (viewer, serviceUrl) {
                this.viewer = viewer;
                this.serviceUrl = serviceUrl;
            };
            ClusterService.prototype.toggleClusters = function () {
                if (this.clustersEntity) {
                    this.clustersEntity.show = !this.clustersEntity.show;
                }
                else {
                    this.clustersEntity = new Cesium.Entity();
                    this.viewer.entities.add(this.clustersEntity);
                    this.addClusters();
                }
            };
            ClusterService.prototype.getClusters = function () {
                return this.$http.get(this.serviceUrl + 'clusters');
            };
            ClusterService.prototype.addClusters = function () {
                var _this = this;
                this.getClusters().then(function (response) {
                    if (response.data) {
                        var clusters = response.data;
                        for (var i = 0; i < clusters.length; i++) {
                            _this.drawCluster(clusters[i]);
                        }
                    }
                    else {
                        console.log("got no clusters");
                    }
                });
            };
            ClusterService.prototype.drawCluster = function (cluster) {
                var clusterProps = this.computeClusterAttributes(cluster.count);
                this.viewer.entities.add({
                    parent: this.clustersEntity,
                    label: {
                        text: cluster.count.toString(),
                        fillColor: Cesium.Color.BLACK,
                        outlineColor: Cesium.Color.WHITE,
                        eyeOffset: new Cesium.Cartesian3(0, (clusterProps.size * 2) + cluster.elev, 0)
                    },
                    position: Cesium.Cartesian3.fromDegrees(cluster.lon, cluster.lat, cluster.elev + clusterProps.size),
                    ellipsoid: {
                        radii: new Cesium.Cartesian3(clusterProps.size, clusterProps.size, clusterProps.size),
                        material: clusterProps.color
                    }
                });
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
            ];
            return ClusterService;
        })();
        clusterService.ClusterService = ClusterService;
        // ng register
        angular
            .module('explorer.rockproperties.clusters', [])
            .factory("clusterService", ["$http", function ($http) { return new rpComponents.clusterService.ClusterService($http); }]);
    })(clusterService = rpComponents.clusterService || (rpComponents.clusterService = {}));
})(rpComponents || (rpComponents = {}));
