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
            function ZoomLevelService($rootScope, rocksConfigService) {
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
            Object.defineProperty(ZoomLevelService.prototype, "nextIndex", {
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
            ZoomLevelService.prototype.getIndex = function (height) {
                for (var i = 0; i < this.zoomLevels.length; i++) {
                    if (height < this.zoomLevels[i]) {
                        return this.zoomLevels.length - i;
                    }
                }
                return this.zoomLevels.length - 1;
            };
            ZoomLevelService.prototype.setActive = function (active) {
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
                "$rootScope",
                "rocksConfigService"
            ];
            return ZoomLevelService;
        }());
        zoom.ZoomLevelService = ZoomLevelService;
        angular
            .module('explorer.rockproperties.zoom', [])
            .factory("zoomLevelService", ["$rootScope", "rocksConfigService",
            function ($rootScope, rocksConfigService) {
                return new rpComponents.zoom.ZoomLevelService($rootScope, rocksConfigService);
            }]);
    })(zoom = rpComponents.zoom || (rpComponents.zoom = {}));
})(rpComponents || (rpComponents = {}));
/// <reference path="../../typings/browser.d.ts" />
/// <reference path="charts" />
/// <reference path="config" />
/// <reference path="cluster-filters" />
/// <reference path="cluster-inspector" />
/// <reference path="zoom" />
var rpComponents;
(function (rpComponents) {
    var clusterService;
    (function (clusterService) {
        'use strict';
        var ClusterHeightWeighter = (function () {
            function ClusterHeightWeighter() {
            }
            ClusterHeightWeighter.prototype.calculateWeighting = function (zoom) {
                return Math.pow(1.43, zoom);
            };
            return ClusterHeightWeighter;
        }());
        clusterService.ClusterHeightWeighter = ClusterHeightWeighter;
        var ClusterService = (function () {
            function ClusterService($http, $rootScope, zoomLevelService, clusterChartService, loadingSpinnerService, rocksConfigService, clusterInspectorService, clusterFilterState) {
                var _this = this;
                this.$http = $http;
                this.$rootScope = $rootScope;
                this.zoomLevelService = zoomLevelService;
                this.clusterChartService = clusterChartService;
                this.loadingSpinnerService = loadingSpinnerService;
                this.rocksConfigService = rocksConfigService;
                this.clusterInspectorService = clusterInspectorService;
                this.clusterFilterState = clusterFilterState;
                this.clusterRangeMeta = {
                    maxExtrudeHeight: 6000000
                };
                this.clusterFilter = '';
                /**
                 *
                 * We get a performance benefit when we use fewer
                 * primitives/collections to draw multiple static geometries.
                 *
                 */
                this.reCluster = function () {
                    var clusterInstances = [];
                    var labelCollection = new Cesium.LabelCollection();
                    _this.getClusters().then(function (response) {
                        if (response.data && response.data.features) {
                            var clusters = response.data.features;
                            // use d3 to build a scale for our extrude heights; we need to build a diff scale
                            // for each zoom level, as we can't guarantee they'll start at the top and work down
                            // (if we add persistence)
                            var maxCorrection = new ClusterHeightWeighter().calculateWeighting(_this.zoomLevelService.nextIndex);
                            _this.clusterRangeMeta.maxCount = d3.max(clusters, function (d) { return d.properties.count; });
                            _this.clusterRangeMeta.scale = d3.scale.linear()
                                .domain([0, _this.clusterRangeMeta.maxCount])
                                .range([0, _this.clusterRangeMeta.maxExtrudeHeight / maxCorrection]);
                            for (var i = 0; i < clusters.length; i++) {
                                // tag id with type for pick handling
                                clusters[i].properties['featureType'] = 'rockPropsCluster';
                                var clusterProps = _this.computeClusterAttributes(clusters[i].properties.count);
                                clusterInstances.push(_this.buildClusterInstance(clusters[i], clusterProps));
                                labelCollection.add(_this.buildLabel(clusters[i], clusterProps)); // No lables for the short term
                            }
                            _this.drawClusters(clusterInstances, labelCollection);
                        }
                        else {
                            console.log("got no clusters");
                            console.log(response);
                        }
                    });
                };
                this.$rootScope.$on('rocks.config.ready', function () {
                    _this.viewer = _this.rocksConfigService.viewer;
                    _this.serviceUrl = _this.rocksConfigService.config.rocksServiceUrl;
                });
                this.$rootScope.$on('rocks.clusters.update', function () {
                    _this.reCluster();
                });
            }
            ClusterService.prototype.toggleClusters = function () {
                if (this.clustersCollection) {
                    this.clustersCollection.show = !this.clustersCollection.show;
                    this.zoomLevelService.setActive(this.clustersCollection.show);
                    if (this.clustersCollection.show) {
                        this.clusterInspectorService.setPickEnabled(true);
                    }
                    else {
                        this.clusterInspectorService.setPickEnabled(false);
                    }
                    this.reCluster();
                }
                else {
                    this.clustersCollection = new Cesium.PrimitiveCollection();
                    this.viewer.scene.primitives.add(this.clustersCollection);
                    this.zoomLevelService.setActive(true);
                    this.reCluster();
                    this.clusterInspectorService.setPickEnabled(true);
                }
                return this.clustersCollection.show;
            };
            /**
             *
             * TODO filters
             *
             * @returns {IHttpPromise<T>}
             */
            ClusterService.prototype.getClusters = function () {
                var west = this.zoomLevelService.getViewExtent(100).west;
                var east = this.zoomLevelService.getViewExtent(100).east;
                var north = this.zoomLevelService.getViewExtent(100).north;
                var south = this.zoomLevelService.getViewExtent(100).south;
                var dx = (east - west) * .2;
                var dy = (north - south) * .2;
                // args
                var args = '?zoom=' + this.zoomLevelService.nextIndex +
                    '&xmin=' + above(west - dx, -180) +
                    '&xmax=' + below(east + dx, 180) +
                    '&ymin=' + above(south - dy, -90) +
                    '&ymax=' + below(north + dy, 90) +
                    this.clusterFilterState.filterQuery;
                console.log("summary query: " + this.serviceUrl + args);
                return this.$http({
                    method: 'GET',
                    // real service
                    url: this.serviceUrl + 'summary' + args
                });
                function above(value, limit) {
                    return value < limit ? limit : value;
                }
                function below(value, limit) {
                    return value > limit ? limit : value;
                }
            };
            ClusterService.prototype.drawClusters = function (instances, labelCollection) {
                this.clustersCollection.removeAll();
                this.clusterPrimitive = new Cesium.Primitive({
                    geometryInstances: instances,
                    appearance: new Cesium.PerInstanceColorAppearance({
                        translucent: true,
                        closed: true
                    })
                });
                this.clusterInspectorService.setClusterPrimitive((this.clusterPrimitive));
                this.clustersCollection.add(this.clusterPrimitive);
                this.clustersCollection.add(labelCollection);
            };
            ClusterService.prototype.buildClusterInstance = function (cluster, clusterProps) {
                return new Cesium.GeometryInstance({
                    geometry: new Cesium.CircleGeometry({
                        center: Cesium.Cartesian3.fromDegrees(cluster.geometry.coordinates[0], cluster.geometry.coordinates[1]),
                        radius: clusterProps.radius,
                        vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
                        extrudedHeight: clusterProps.extrudeHeight
                    }),
                    id: cluster,
                    attributes: {
                        color: Cesium.ColorGeometryInstanceAttribute.fromColor(clusterProps.color)
                    }
                });
            };
            ClusterService.prototype.buildLabel = function (cluster, clusterProps) {
                return {
                    position: Cesium.Cartesian3.fromDegrees(cluster.geometry.coordinates[0], cluster.geometry.coordinates[1], clusterProps.extrudeHeight + clusterProps.radius + 30),
                    text: cluster.properties.count.toString(),
                    fillColor: Cesium.Color.BLACK,
                    outlineColor: Cesium.Color.RED,
                    // TODO review labelling
                    font: (26 - (this.zoomLevelService.nextIndex * 0.2)) + 'px arial, sans-serif',
                    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                    id: cluster
                };
            };
            ClusterService.prototype.computeClusterAttributes = function (count) {
                var radius = this.zoomLevelService.zoomLevels[this.zoomLevelService.zoomLevels.length - this.zoomLevelService.nextIndex] / 150;
                var maxHeight = this.zoomLevelService.nextPosition.height * 0.6;
                var extrudeHeight = this.clusterRangeMeta.scale(count) / Math.pow(this.zoomLevelService.nextIndex / 3, 1.15);
                if (extrudeHeight > maxHeight) {
                    extrudeHeight = maxHeight;
                }
                if (radius > maxHeight / 20) {
                    console.log("To big!");
                    radius = maxHeight / 20;
                }
                var attrs = {
                    // tweak these to scale cluster size/extrude on zoom
                    radius: radius,
                    extrudeHeight: extrudeHeight
                };
                if (count < 100) {
                    attrs.color = Cesium.Color.fromCssColorString('#4781cd').withAlpha(0.5);
                }
                else if (count < 1000) {
                    attrs.radius *= 1.3;
                    attrs.color = Cesium.Color.fromCssColorString('#0fc70e').withAlpha(0.5);
                }
                else {
                    attrs.radius *= 1.6;
                    attrs.color = Cesium.Color.fromCssColorString('#ff0000').withAlpha(0.5);
                }
                return attrs;
            };
            ClusterService.$inject = [
                "$http",
                "$rootScope",
                "zoomLevelService",
                "clusterChartService",
                "loadingSpinnerService",
                "rocksConfigService",
                "clusterInspectorService",
                "clusterFilterState"
            ];
            return ClusterService;
        }());
        clusterService.ClusterService = ClusterService;
        angular
            .module('explorer.rockproperties.clusters', [])
            .factory("clusterService", [
            "$http",
            "$rootScope",
            "zoomLevelService",
            "clusterChartService",
            "loadingSpinnerService",
            "rocksConfigService",
            "clusterInspectorService",
            "clusterFilterState",
            function ($http, $rootScope, zoomLevelService, clusterChartService, chartSpinnerService, rocksConfigService, clusterInspectorService, clusterFilterState) {
                return new rpComponents.clusterService.ClusterService($http, $rootScope, zoomLevelService, clusterChartService, chartSpinnerService, rocksConfigService, clusterInspectorService, clusterFilterState);
            }]);
    })(clusterService = rpComponents.clusterService || (rpComponents.clusterService = {}));
})(rpComponents || (rpComponents = {}));
/// <reference path="../../typings/browser.d.ts" />
/// <reference path="clusters" />
var rpComponents;
(function (rpComponents) {
    var controlPanel;
    (function (controlPanel) {
        'use strict';
        var RocksPanelCtrl = (function () {
            function RocksPanelCtrl($scope, rocksPanelService, wmsInspectorService) {
                var _this = this;
                this.$scope = $scope;
                this.rocksPanelService = rocksPanelService;
                this.wmsInspectorService = wmsInspectorService;
                this.targetPanel = '';
                this.$scope.$on("rocks.accordion.update", function (event, data) {
                    _this.targetPanel = data;
                });
            }
            RocksPanelCtrl.prototype.setTargetPanel = function (targetPanel) {
                this.targetPanel = (this.targetPanel != targetPanel) ? targetPanel : "";
            };
            RocksPanelCtrl.$inject = ["$scope", "rocksPanelService", "wmsInspectorService"];
            return RocksPanelCtrl;
        }());
        controlPanel.RocksPanelCtrl = RocksPanelCtrl;
        var RocksPanelService = (function () {
            function RocksPanelService($rootScope, clusterService, wmsPointsService, rocksConfigService) {
                this.$rootScope = $rootScope;
                this.clusterService = clusterService;
                this.wmsPointsService = wmsPointsService;
                this.rocksConfigService = rocksConfigService;
                this.clustersEnabled = false;
                this.pointsEnabled = false;
            }
            /**
             *
             * The entry point for the component.
             *
             * @param viewer
             * @param clusterServiceUrl
             * @param wmsServiceUrl
             * @param pickEnabled
             */
            RocksPanelService.prototype.init = function (viewer, config) {
                this.viewer = viewer;
                this.rocksConfigService.setConfig(config, viewer);
            };
            RocksPanelService.prototype.toggleClusters = function () {
                this.clustersEnabled = this.clusterService.toggleClusters();
            };
            RocksPanelService.prototype.togglePoints = function () {
                this.pointsEnabled = this.wmsPointsService.togglePoints();
            };
            RocksPanelService.$inject = [
                "$rootScope",
                "clusterService",
                "wmsPointsService",
                "rocksConfigService"
            ];
            return RocksPanelService;
        }());
        controlPanel.RocksPanelService = RocksPanelService;
        angular
            .module('explorer.rockproperties.controlpanel', [])
            .factory("rocksPanelService", [
            "$rootScope", "clusterService", "wmsPointsService", "rocksConfigService",
            function ($rootScope, clusterService, wmsPointsService, rocksConfigService) {
                return new rpComponents.controlPanel.RocksPanelService($rootScope, clusterService, wmsPointsService, rocksConfigService);
            }
        ])
            .controller("rocksPanelCtrl", RocksPanelCtrl)
            .directive("rocksControlPanel", function () {
            return {
                templateUrl: 'rockprops/control-panel.html',
                controller: RocksPanelCtrl,
                controllerAs: 'controlPanelVM'
            };
        });
    })(controlPanel = rpComponents.controlPanel || (rpComponents.controlPanel = {}));
})(rpComponents || (rpComponents = {}));
/// <reference path="../../typings/browser.d.ts" />
/// <reference path="control-panel" />
/// <reference path="spinner" />
var rpComponents;
(function (rpComponents) {
    var clusterInspector;
    (function (clusterInspector) {
        'use strict';
        var ClusterInspectorCtrl = (function () {
            function ClusterInspectorCtrl($scope, clusterInspectorService, rocksPanelService) {
                this.$scope = $scope;
                this.clusterInspectorService = clusterInspectorService;
                this.rocksPanelService = rocksPanelService;
            }
            ClusterInspectorCtrl.$inject = ["$scope", "clusterInspectorService", "rocksPanelService"];
            return ClusterInspectorCtrl;
        }());
        clusterInspector.ClusterInspectorCtrl = ClusterInspectorCtrl;
        var PagingState = (function () {
            function PagingState(count, total) {
                this.count = count;
                this.total = total;
            }
            PagingState.prototype.more = function () {
                return this.total > this.count;
            };
            return PagingState;
        }());
        clusterInspector.PagingState = PagingState;
        var ClusterInspectorService = (function () {
            function ClusterInspectorService($http, $rootScope, $timeout, zoomLevelService, loadingSpinnerService, rocksConfigService, clusterChartService, clusterFilterState) {
                var _this = this;
                this.$http = $http;
                this.$rootScope = $rootScope;
                this.$timeout = $timeout;
                this.zoomLevelService = zoomLevelService;
                this.loadingSpinnerService = loadingSpinnerService;
                this.rocksConfigService = rocksConfigService;
                this.clusterChartService = clusterChartService;
                this.clusterFilterState = clusterFilterState;
                this.inspectMode = "CHART";
                this.listReady = false;
                // TODO decide reasonable step size when plugged into real service
                this.maxListStep = 100;
                this.$rootScope.$on('rocks.config.ready', function () {
                    _this.init();
                });
            }
            /**
             *
             
             * @param viewer
             * @param summaryService
             * @param usePicking
             */
            ClusterInspectorService.prototype.init = function () {
                var _this = this;
                this.viewer = this.rocksConfigService.viewer;
                this.serviceUrl = this.rocksConfigService.config.rocksServiceUrl;
                // setup our pick handler
                if (this.rocksConfigService.config.useClusterPicking) {
                    this.pickHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
                    this.pickHandlerAction = function (movement) {
                        var pick = _this.viewer.scene.pick(movement.position);
                        if (Cesium.defined(pick) && Cesium.defined(pick.id) && pick.id.hasOwnProperty('properties') && pick.id.properties.featureType == 'rockPropsCluster') {
                            _this.listReady = false;
                            _this.clearHighlighted();
                            _this.targetId = pick.id;
                            _this.setHighlighted(_this.targetId, true);
                            _this.targetPos = Cesium.Ellipsoid.WGS84.cartesianToCartographic(_this.viewer.camera.pickEllipsoid(movement.position));
                            if (_this.inspectMode == "CHART") {
                                _this.chartClusterQuery();
                            }
                            else {
                                _this.listIndex = 0;
                                _this.listClusterQuery();
                            }
                        }
                    };
                }
            };
            /**
             *
             * Gets a summary of cluster data to pass to chartService.
             *
             * @param cluster
             */
            ClusterInspectorService.prototype.chartClusterQuery = function () {
                var _this = this;
                //  spinner for summary chart load
                if (this.summarySpinner) {
                    document.getElementById("cluster-summary-chart-loading").style.display = 'block';
                }
                else {
                    this.summarySpinner = this.loadingSpinnerService.addSpinner({
                        width: 100,
                        height: 100,
                        container: "#cluster-summary-chart-loading",
                        id: "chart-spinner"
                    });
                    this.summarySpinner();
                }
                var args = '?zoom=' + this.zoomLevelService.nextIndex +
                    '&x=' + Cesium.Math.toDegrees(this.targetPos.longitude) +
                    '&y=' + Cesium.Math.toDegrees(this.targetPos.latitude) +
                    this.clusterFilterState.filterQuery;
                var query = this.serviceUrl + 'query' + args;
                console.log("query");
                console.log(query);
                this.$http({
                    method: 'GET',
                    url: query
                }).then(function (response) {
                    if (response.hasOwnProperty('data')) {
                        _this.clusterChartService.buildChart(response.data);
                    }
                });
                ga('send', 'event', 'explorer-rock-properties', 'click', 'cluster inspector summary charts');
            };
            ClusterInspectorService.prototype.loadNextListStep = function () {
                this.listIndex += this.maxListStep;
                console.log("loadNextListStep " + this.listIndex);
                this.listClusterQuery();
            };
            ClusterInspectorService.prototype.listClusterQuery = function () {
                var _this = this;
                console.log("listClusterQuery");
                //  spinner for summary chart load
                if (this.listSpinner) {
                    document.getElementById("cluster-result-list-loading").style.display = 'block';
                }
                else {
                    this.listSpinner = this.loadingSpinnerService.addSpinner({
                        width: 100,
                        height: 100,
                        container: "#cluster-result-list-loading",
                        id: "cluster-result-list-spinner"
                    });
                    this.listSpinner();
                }
                var args = '?zoom=' + this.zoomLevelService.nextIndex +
                    '&maxCount=' + this.maxListStep +
                    '&startIndex=' + this.listIndex +
                    '&x=' + Cesium.Math.toDegrees(this.targetPos.longitude) +
                    '&y=' + Cesium.Math.toDegrees(this.targetPos.latitude) +
                    this.clusterFilterState.filterQuery;
                var query = this.serviceUrl + 'features' + args;
                console.log("features query");
                console.log(query);
                this.$http({
                    method: 'GET',
                    // mock
                    //url: this.serviceUrl + '/mock-feature-list.json'
                    // real service
                    url: query
                }).then(function (response) {
                    if (response.hasOwnProperty('data')) {
                        _this.$timeout(function () {
                            document.getElementById("cluster-result-list-loading").style.display = 'none';
                            _this.listReady = true;
                            // step, merge features
                            if (_this.listIndex != 0) {
                                _this.listFeatures.features = _this.listFeatures.features.concat(response.data.features);
                            }
                            else {
                                _this.listFeatures = response.data;
                            }
                            var morePages = _this.listFeatures.features.length < _this.listFeatures.totalFeatures;
                            _this.pagingState = new PagingState(_this.listFeatures.features.length, _this.listFeatures.totalFeatures);
                        }, 1000);
                    }
                });
                ga('send', 'event', 'explorer-rock-properties', 'click', 'cluster inspector feature list (startIndex: ' + this.listIndex + ')');
            };
            ClusterInspectorService.prototype.setPickEnabled = function (enabled) {
                if (enabled) {
                    this.pickHandler.setInputAction(this.pickHandlerAction, Cesium.ScreenSpaceEventType.LEFT_CLICK);
                }
                else {
                    this.pickHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
                }
            };
            ClusterInspectorService.prototype.setClusterPrimitive = function (primitive) {
                this.clusterPrimitive = primitive;
            };
            ClusterInspectorService.prototype.setHighlighted = function (id, highlight) {
                var attributes = this.clusterPrimitive.getGeometryInstanceAttributes(id);
                if (attributes && highlight) {
                    attributes.prevColor = attributes.color;
                    attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.fromCssColorString('#ff00ff').withAlpha(1));
                }
            };
            ClusterInspectorService.prototype.clearHighlighted = function () {
                if (this.targetId) {
                    var attributes = this.clusterPrimitive.getGeometryInstanceAttributes(this.targetId);
                    if (attributes && attributes.hasOwnProperty('prevColor')) {
                        attributes.color = attributes.prevColor;
                    }
                }
            };
            ClusterInspectorService.$inject = [
                "$http",
                "$rootScope",
                "$timeout",
                "zoomLevelService",
                "loadingSpinnerService",
                "rocksConfigService",
                "clusterChartService",
                "clusterFilterState"
            ];
            return ClusterInspectorService;
        }());
        clusterInspector.ClusterInspectorService = ClusterInspectorService;
        angular
            .module('explorer.rockproperties.clusterinspector', [])
            .controller("clusterInspectorCtrl", ClusterInspectorCtrl)
            .directive("rocksClusterInspectorPanel", function () {
            return {
                templateUrl: 'rockprops/cluster-inspector.html',
                controller: ClusterInspectorCtrl,
                controllerAs: 'clusterInspectorVM'
            };
        })
            .factory("clusterInspectorService", [
            "$http",
            "$rootScope",
            "$timeout",
            "zoomLevelService",
            "loadingSpinnerService",
            "rocksConfigService",
            "clusterChartService",
            "clusterFilterState",
            function ($http, $rootScope, $timeout, zoomLevelService, chartSpinnerService, rocksConfigService, clusterChartService, clusterFilterState) {
                return new rpComponents.clusterInspector.ClusterInspectorService($http, $rootScope, $timeout, zoomLevelService, chartSpinnerService, rocksConfigService, clusterChartService, clusterFilterState);
            }]);
    })(clusterInspector = rpComponents.clusterInspector || (rpComponents.clusterInspector = {}));
})(rpComponents || (rpComponents = {}));
/// <reference path="../../typings/browser.d.ts" />
var rpComponents;
(function (rpComponents) {
    var wmsInspectorState;
    (function (wmsInspectorState) {
        'use strict';
        /*
            The WMS inspector panel can be in 1 of 3 view states:
            1. INTRO - the default/home shows prompt
            2. LAYERSELECT - user presented with layers to interrogate with GetFeatureInfo when
            they have clicked a point on the map
            3. FEATUREINFO - view to present raw html returned by GetFeatureInfo
         */
        var WmsInspectorState = (function () {
            function WmsInspectorState() {
                this.view = "INTRO";
            }
            return WmsInspectorState;
        }());
        wmsInspectorState.WmsInspectorState = WmsInspectorState;
        angular
            .module('explorer.rockproperties.inspectorstate', [])
            .factory("wmsInspectorState", [function () { return new rpComponents.wmsInspectorState.WmsInspectorState(); }]);
    })(wmsInspectorState = rpComponents.wmsInspectorState || (rpComponents.wmsInspectorState = {}));
})(rpComponents || (rpComponents = {}));
/// <reference path="../../typings/browser.d.ts" />
/// <reference path="spinner" />
/// <reference path="clipship" />
var rpComponents;
(function (rpComponents) {
    var wmsInspectorService;
    (function (wmsInspectorService_1) {
        'use strict';
        var WmsInspectorCtrl = (function () {
            function WmsInspectorCtrl($scope, wmsInspectorState, wmsInspectorService) {
                this.$scope = $scope;
                this.wmsInspectorState = wmsInspectorState;
                this.wmsInspectorService = wmsInspectorService;
            }
            WmsInspectorCtrl.$inject = ["$scope", "wmsInspectorState", "wmsInspectorService"];
            return WmsInspectorCtrl;
        }());
        wmsInspectorService_1.WmsInspectorCtrl = WmsInspectorCtrl;
        var WmsInspectorService = (function () {
            function WmsInspectorService($rootScope, $http, wmsInspectorState, assetsService, configService, rocksConfigService, loadingSpinnerService, gwsUtilService, rocksClipShipService) {
                var _this = this;
                this.$rootScope = $rootScope;
                this.$http = $http;
                this.wmsInspectorState = wmsInspectorState;
                this.assetsService = assetsService;
                this.configService = configService;
                this.rocksConfigService = rocksConfigService;
                this.loadingSpinnerService = loadingSpinnerService;
                this.gwsUtilService = gwsUtilService;
                this.rocksClipShipService = rocksClipShipService;
                this.isLoading = false;
                this.URL_EXCLUDE = "?SERVICE=WMS&";
                this.SURFACE_GEO = "GA_Surface_Geology_of_Australia";
                this.$inject = [
                    "$rootScope",
                    "$http",
                    "wmsInspectorState",
                    "assetsService",
                    "configService",
                    "rocksConfigService",
                    "loadingSpinnerService",
                    "gwsUtilService",
                    "rocksClipShipService"
                ];
                // register listener for pointInspector
                this.$rootScope.$on("viewer.click.left", function (event, data) {
                    data.degrees = {
                        lat: Cesium.Math.toDegrees(data.cartographic.latitude),
                        lon: Cesium.Math.toDegrees(data.cartographic.longitude)
                    };
                    // TODO should flasher for this so user knows why
                    // (we don't want inspector interuppting clipship drawing)
                    if (_this.rocksClipShipService.isDrawing) {
                        return;
                    }
                    if (_this.inspectorEnabled && data.hasOwnProperty('cartographic')) {
                        // make sure panel is visible
                        _this.$rootScope.$broadcast("rocks.accordion.update", "wmsInspector");
                        _this.$rootScope.$broadcast("toolbar.toggle.update", { linked: false, key: "rocksClusters", isActive: true });
                        _this.wmsInspectorState.targetGeom = data;
                        _this.wmsInspectorState.view = "LAYERSELECT";
                        _this.wmsInspectorState.cameraHeight = Cesium.Ellipsoid.WGS84.cartesianToCartographic(_this.rocksConfigService.viewer.camera.position).height;
                    }
                });
                this.$rootScope.$on('rocks.config.ready', function () {
                    // load feature classes
                    assetsService.getReferenceFeatureClasses().then(function (features) {
                        _this.features = features;
                    });
                    // init rocks feature
                    _this.rocksFeature = {
                        wmsUrl: _this.rocksConfigService.config.geoserverWmsUrl,
                        name: 'Rock Properties Layer'
                    };
                });
            }
            WmsInspectorService.prototype.togglePointInspector = function () {
                this.inspectorEnabled != this.inspectorEnabled;
            };
            // TODO we should restrict the query to visible layers
            WmsInspectorService.prototype.queryRocks = function () {
                if (!this.rocksFeature.hasOwnProperty('layers') && this.gwsUtilService.wmsLayerNames) {
                    this.rocksFeature.layers = [];
                    for (var i = 0; i < this.gwsUtilService.wmsLayerNames.length; i++) {
                        this.rocksFeature.layers.push(this.rocksConfigService.config.geoserverWmsLayerPrefix +
                            this.gwsUtilService.wmsLayerNames[i]);
                    }
                }
                this.queryFeature(this.rocksFeature);
            };
            WmsInspectorService.prototype.queryFeature = function (feature) {
                var _this = this;
                ga('send', 'event', 'explorer-rock-properties', 'click', 'wms inspector query: ' + feature.name);
                // set view
                this.wmsInspectorState.view = "FEATUREINFO";
                this.toggleLoading();
                var targetUrl = feature.wmsUrl;
                var targetLayers = feature.layers;
                // clean any endpoints already containing '?'
                if (targetUrl.indexOf(this.URL_EXCLUDE) > -1) {
                    targetUrl = targetUrl.substring(0, (targetUrl.length - this.URL_EXCLUDE.length));
                }
                // surface geology has scale dependencies, so we need to check
                // zoom (aka camera height) to ensure we query the correct layer
                if (targetUrl.indexOf(this.SURFACE_GEO) > -1) {
                    if (this.wmsInspectorState.cameraHeight <= 340000) {
                        targetLayers = [targetLayers[0]];
                    }
                    else {
                        targetLayers = [targetLayers[1]];
                    }
                }
                var queryString = '?SERVICE=WMS' +
                    '&REQUEST=GetFeatureInfo' +
                    '&VERSION=1.1.1' +
                    '&LAYERS=' + targetLayers +
                    '&STYLES=' +
                    '&SRS=EPSG%3A4326' +
                    '&FORMAT=image%2Fpng' +
                    // we use the click pos as the bottom left corner
                    // and offset the top right by ~30 meters
                    // (can be hard to click on a point if res is too fine)
                    '&BBOX=' +
                    (this.wmsInspectorState.targetGeom.degrees.lon) + ',' +
                    (this.wmsInspectorState.targetGeom.degrees.lat) + ',' +
                    (this.wmsInspectorState.targetGeom.degrees.lon + 0.003) + ',' +
                    (this.wmsInspectorState.targetGeom.degrees.lat + 0.003) +
                    '&QUERY_LAYERS=' + targetLayers +
                    '&INFO_FORMAT=text%2Fhtml' +
                    '&FEATURE_COUNT=100' +
                    '&WIDTH=2' +
                    '&HEIGHT=2' +
                    '&X=1' +
                    '&Y=1' +
                    '&TRANSPARENT=true' +
                    '&EXCEPTIONS=application%2Fvnd.ogc.se_xml';
                // send the query
                this.$http.get(targetUrl + queryString).success(function (data) {
                    _this.featureInfo = data;
                    _this.toggleLoading();
                })
                    .error(function (data, status, headers, config) {
                    console.log("Couldn't load WMS GetFeatureInfo");
                    this.featureInfo = "<h5>Couldn't load WMS GetFeatureInfo for this layer.</h5><p>You may not be able to access this function for some layers.</p>";
                    this.toggleLoading();
                });
            };
            WmsInspectorService.prototype.toggleLoading = function () {
                if (this.loadingSpinner) {
                    this.isLoading = !this.isLoading;
                }
                else {
                    this.loadingSpinner = this.loadingSpinnerService.addSpinner({
                        width: 60,
                        height: 60,
                        container: "#rocks-inspector-loading",
                        id: "rocks-inspector-spinner"
                    });
                    this.loadingSpinner();
                    this.isLoading = true;
                }
            };
            return WmsInspectorService;
        }());
        wmsInspectorService_1.WmsInspectorService = WmsInspectorService;
        angular
            .module('explorer.rockproperties.inspector', [])
            .factory("wmsInspectorService", [
            "$rootScope",
            "$http",
            "wmsInspectorState",
            "assetsService",
            "configService",
            "rocksConfigService",
            "loadingSpinnerService",
            "gwsUtilService",
            "rocksClipShipService",
            function ($rootScope, $http, wmsInspectorState, assetsService, configService, rocksConfigService, loadingSpinnerService, gwsUtilService, rocksClipShipService) {
                return new rpComponents.wmsInspectorService.WmsInspectorService($rootScope, $http, wmsInspectorState, assetsService, configService, rocksConfigService, loadingSpinnerService, gwsUtilService, rocksClipShipService);
            }])
            .controller("wmsInspectorCtrl", rpComponents.wmsInspectorService.WmsInspectorCtrl)
            .directive("wmsInspectorPanel", function () {
            return {
                templateUrl: 'rockprops/wms-inspector-panel.html',
                controller: WmsInspectorCtrl,
                controllerAs: 'wmsInspectorVM'
            };
        });
    })(wmsInspectorService = rpComponents.wmsInspectorService || (rpComponents.wmsInspectorService = {}));
})(rpComponents || (rpComponents = {}));
