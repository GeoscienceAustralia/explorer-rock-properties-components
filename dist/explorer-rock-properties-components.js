/// <reference path="../../typings/tsd.d.ts" />
var rpComponents;
(function (rpComponents) {
    var chartService;
    (function (chartService) {
        'use strict';
        var ClusterChartCtrl = (function () {
            function ClusterChartCtrl($scope, clusterChartService, clusterService) {
                this.$scope = $scope;
                this.clusterChartService = clusterChartService;
                this.clusterService = clusterService;
            }
            ClusterChartCtrl.$inject = ["$scope", "clusterChartService", "clusterService"];
            return ClusterChartCtrl;
        })();
        chartService.ClusterChartCtrl = ClusterChartCtrl;
        var ClusterChartService = (function () {
            function ClusterChartService($http, $rootScope) {
                this.$http = $http;
                this.$rootScope = $rootScope;
            }
            ClusterChartService.prototype.hideChart = function () {
                this.$rootScope.$broadcast("chart.update", {
                    targetChartId: false
                });
            };
            /**
             *
             * @param cluster
             *
             */
            ClusterChartService.prototype.buildChart = function (dataset) {
                document.getElementById("cluster-summary-chart-d3").innerHTML = "";
                // trigger open/display a chart div
                this.$rootScope.$broadcast("chart.update", {
                    targetChartId: "clusterSummaryChart"
                });
                /*---------------------------------------- D3 -----------------------------------------*/
                // LAYOUT
                var minWidth = 1250;
                var minHeight = 255;
                var numberOfCharts = (dataset.length < 7) ? dataset.length : 4; // use two rows if we get too many properties
                var width;
                var height;
                var padding;
                var donutWidth;
                if (document.body.clientHeight * 0.35 > minHeight && document.body.clientWidth > minWidth) {
                    padding = { top: 0, right: 10, bottom: 0, left: 10 };
                    width = document.body.clientWidth / numberOfCharts - (2 * padding.left + padding.right);
                    height = document.body.clientHeight * 0.35;
                    donutWidth = 20;
                }
                else {
                    padding = { top: 0, right: 5, bottom: 0, left: 5 };
                    width = minWidth / numberOfCharts - (2 * padding.left + padding.right);
                    height = minHeight;
                    donutWidth = 15;
                }
                var panelWidth = document.body.clientWidth - (2 * padding.left + padding.right);
                var radius = Math.min(width, height) / 2;
                // DATA
                // build a chart for each property
                dataset.forEach(function (property) {
                    var color = d3.scale.category20();
                    var svg = d3.select('#cluster-summary-chart-d3')
                        .append('svg')
                        .attr('width', width)
                        .attr('height', height)
                        .style('margin-left', padding.left + 'px')
                        .style('margin-right', padding.right + 'px')
                        .append('g')
                        .attr('transform', 'translate(' + (width / 2) +
                        ',' + ((height / 2) + 10) + ')');
                    var arc = d3.svg.arc()
                        .innerRadius(radius - donutWidth)
                        .outerRadius(radius);
                    var pie = d3.layout.pie()
                        .value(function (d) { return d.count; })
                        .sort(null);
                    var tooltip = d3.select('#cluster-summary-chart-d3')
                        .append('div')
                        .attr('class', 'cluster-summary-tooltip');
                    tooltip.append('div')
                        .attr('class', 'attribute');
                    tooltip.append('div')
                        .attr('class', 'count');
                    tooltip.append('div')
                        .attr('class', 'percent');
                    var path = svg.selectAll('path')
                        .data(pie(property.data))
                        .enter()
                        .append('path')
                        .attr('d', arc)
                        .attr('fill', function (d, i) {
                        return color(d.data.attributeName);
                    })
                        .each(function (d) { this._current = d; });
                    path.on('mouseover', function (d) {
                        var total = d3.sum(property.data.map(function (d) {
                            return d.count;
                        }));
                        var percent = Math.round(1000 * d.data.count / total) / 10;
                        tooltip.select('.attribute').html(d.data.attributeName);
                        tooltip.select('.count').html("Count: " + d.data.count);
                        tooltip.select('.percent').html("Percent: " + percent + '%');
                        tooltip.style('display', 'block');
                    });
                    path.on('mouseout', function () {
                        tooltip.style('display', 'none');
                    });
                    path.on('mousemove', function (d) {
                        var x = (d3.event.pageX > panelWidth - 180) ? d3.event.pageX - 180 : d3.event.pageX;
                        var y = (d3.event.pageY > document.body.clientHeight - 120) ? d3.event.pageY - 100 : d3.event.pageY + 10;
                        tooltip
                            .style('top', y + 'px')
                            .style('left', x + 'px');
                    });
                    // title
                    svg.append("g")
                        .attr("class", "cluster-summary-chart-title")
                        .append("text")
                        .attr("x", 0)
                        .attr("y", -((height / 2) + 7))
                        .attr("dy", ".71em")
                        .style("text-anchor", "middle")
                        .style("fill", "#000")
                        .style("font-weight", "bold")
                        .text(property.propertyName);
                    // PAGINATED LEGEND
                    var legendCount = property.data.length;
                    var legendWidth = 15;
                    var legendSpacing = 6;
                    var netLegendHeight = (legendWidth + legendSpacing) * legendCount;
                    var legendPerPage;
                    var totalPages;
                    var pageNo;
                    if ((netLegendHeight / radius) > 1) {
                        legendPerPage = Math.floor(radius / (legendWidth + legendSpacing));
                        totalPages = Math.ceil(legendCount / legendPerPage);
                        pageNo = 1;
                        var startIndex = (pageNo - 1) * legendPerPage;
                        var endIndex = startIndex + legendPerPage;
                        var dataSubset = [];
                        for (var i = 0; i < property.data.length; i++) {
                            if (i >= startIndex && i < endIndex) {
                                dataSubset.push(property.data[i]);
                            }
                        }
                        drawLegend(dataSubset, legendPerPage, pageNo, totalPages);
                    }
                    else {
                        drawLegend(property.data, Math.floor(radius / (legendWidth + legendSpacing)), 1, 1);
                    }
                    /**
                     *
                     * Draws paginated legend if we need multiple pages
                     *
                     * @param data
                     * @param legendPerPage
                     * @param pageNo
                     * @param totalPages
                     */
                    function drawLegend(data, legendPerPage, pageNo, totalPages) {
                        var legend = svg.selectAll("g.legendg")
                            .data(data)
                            .enter().append("g")
                            .attr('class', 'legendg')
                            .attr("transform", function (d, i) { return "translate(" + -(width / 2.3) + "," + ((i * (legendWidth + legendSpacing)) - (height / 4)) + ")"; });
                        var legendRect = legend.append("rect")
                            .attr("x", 45)
                            .attr("width", legendWidth)
                            .attr("height", legendWidth)
                            .attr("class", "legend")
                            .style('fill', function (d, i) { return color(d.attributeName); });
                        var legendText = legend.append("text")
                            .attr("x", 65)
                            .attr("y", 6)
                            .attr("dy", ".35em")
                            .style("text-anchor", "start")
                            .text(function (d) {
                            // truncate long labels
                            var charSpace = (radius - 20) / 5;
                            if (d.attributeName.length > charSpace)
                                return d.attributeName.substring(0, charSpace) + '...';
                            else
                                return d.attributeName;
                        });
                        // title tooltips
                        legendRect.append("svg:title").text(function (d) {
                            var total = d3.sum(property.data.map(function (d) { return d.count; }));
                            return d.attributeName + " (" + Math.round(1000 * d.count / total) / 10 + "%)";
                        });
                        legendText.append("svg:title").text(function (d) {
                            var total = d3.sum(property.data.map(function (d) { return d.count; }));
                            return d.attributeName + " (" + Math.round(1000 * d.count / total) / 10 + "%)";
                        });
                        if (totalPages > 1) {
                            var pageText = svg.append("g")
                                .attr('class', 'pageNo')
                                .attr("transform", "translate(" + (-10) + "," + ((legendPerPage + 1) * (legendWidth + legendSpacing) - (height / 4)) + ")");
                            pageText.append('text').text(pageNo + '/' + totalPages)
                                .attr('dx', '.25em');
                            var prevtriangle = svg.append("g")
                                .attr('class', 'prev')
                                .attr("transform", "translate(" + (-20) + "," + ((legendPerPage + 1.5) * (legendWidth + legendSpacing) - (height / 4)) + ")")
                                .on('click', prevLegend)
                                .style('cursor', 'pointer');
                            var nexttriangle = svg.append("g")
                                .attr('class', 'next')
                                .attr("transform", "translate(" + (0) + "," + ((legendPerPage + 1.5) * (legendWidth + legendSpacing) - (height / 4)) + ")")
                                .on('click', nextLegend)
                                .style('cursor', 'pointer');
                            nexttriangle.append('polygon')
                                .style('stroke', '#000')
                                .style('fill', '#000')
                                .attr('points', '0,0, 20,0, 10,10');
                            prevtriangle.append('polygon')
                                .style('stroke', '#000')
                                .style('fill', '#000')
                                .attr('points', '0,10, 20,10, 10,0');
                            if (pageNo == totalPages) {
                                nexttriangle.style('opacity', '0.3');
                                nexttriangle.on('click', '')
                                    .style('cursor', '');
                            }
                            else if (pageNo == 1) {
                                prevtriangle.style('opacity', '0.3');
                                prevtriangle.on('click', '')
                                    .style('cursor', '');
                            }
                        }
                    }
                    function prevLegend() {
                        pageNo--;
                        svg.selectAll("g.legendg").remove();
                        svg.select('.pageNo').remove();
                        svg.select('.prev').remove();
                        svg.select('.next').remove();
                        var startIndex = (pageNo - 1) * legendPerPage;
                        var endIndex = startIndex + legendPerPage;
                        var dataSubset = [];
                        for (var i = 0; i < property.data.length; i++) {
                            if (i >= startIndex && i < endIndex) {
                                dataSubset.push(property.data[i]);
                            }
                        }
                        drawLegend(dataSubset, legendPerPage, pageNo, totalPages);
                    }
                    function nextLegend() {
                        pageNo++;
                        svg.selectAll("g.legendg").remove();
                        svg.select('.pageNo').remove();
                        svg.select('.prev').remove();
                        svg.select('.next').remove();
                        var startIndex = (pageNo - 1) * legendPerPage;
                        var endIndex = startIndex + legendPerPage;
                        var seriesSubset = [];
                        for (var i = 0; i < property.data.length; i++) {
                            if (i >= startIndex && i < endIndex) {
                                seriesSubset.push(property.data[i]);
                            }
                        }
                        drawLegend(seriesSubset, legendPerPage, pageNo, totalPages);
                    }
                });
                /*---------------------------------------- /D3 -----------------------------------------*/
                // DEBUG emulate loading..
                document.getElementById("cluster-summary-chart-d3").style.display = 'none';
                // chart ready to go
                setTimeout(function () {
                    document.getElementById("cluster-summary-chart-loading").style.display = 'none';
                    document.getElementById("cluster-summary-chart-d3").style.display = 'block';
                }, 1500);
                return;
            };
            ClusterChartService.$inject = [
                "$http",
                "$rootScope"
            ];
            return ClusterChartService;
        })();
        chartService.ClusterChartService = ClusterChartService;
        angular
            .module('explorer.rockproperties.charts', [])
            .factory("clusterChartService", ["$http", "$rootScope",
            function ($http, $rootScope) {
                return new rpComponents.chartService.ClusterChartService($http, $rootScope);
            }])
            .controller("clusterChartCtrl", ClusterChartCtrl)
            .directive("clusterChartSummary", function () {
            return {
                templateUrl: 'rockprops/cluster-summary.html',
                controller: ClusterChartCtrl,
                controllerAs: 'clusterChartVM'
            };
        });
    })(chartService = rpComponents.chartService || (rpComponents.chartService = {}));
})(rpComponents || (rpComponents = {}));
/// <reference path="../../typings/tsd.d.ts" />
var rpComponents;
(function (rpComponents) {
    var clipShipService;
    (function (clipShipService) {
        'use strict';
        var RocksClipShipCtrl = (function () {
            function RocksClipShipCtrl($scope, $timeout, rocksClipShipService, rocksPanelService, rocksFiltersService, rocksQueryBuilderExport) {
                this.$scope = $scope;
                this.$timeout = $timeout;
                this.rocksClipShipService = rocksClipShipService;
                this.rocksPanelService = rocksPanelService;
                this.rocksFiltersService = rocksFiltersService;
                this.rocksQueryBuilderExport = rocksQueryBuilderExport;
            }
            RocksClipShipCtrl.prototype.startClipShip = function () {
                var _this = this;
                this.$timeout(function () {
                    _this.rocksClipShipService.step = 'download';
                    _this.rocksQueryBuilderExport.startClipShip(_this.rocksFiltersService.exportProperties.filterOptions, _this.rocksClipShipService.targetFormat, _this.rocksClipShipService.targetExtent);
                });
            };
            RocksClipShipCtrl.$inject = [
                "$scope",
                "$timeout",
                "rocksClipShipService",
                "rocksPanelService",
                "rocksFiltersService",
                "rocksQueryBuilderExport"
            ];
            return RocksClipShipCtrl;
        })();
        clipShipService.RocksClipShipCtrl = RocksClipShipCtrl;
        var RocksClipShipService = (function () {
            function RocksClipShipService($rootScope, rocksFiltersService, rocksConfigService) {
                var _this = this;
                this.$rootScope = $rootScope;
                this.rocksFiltersService = rocksFiltersService;
                this.rocksConfigService = rocksConfigService;
                this.step = "startDraw";
                this.$inject = [
                    "$rootScope",
                    "rocksFiltersService",
                    "rocksConfigService"
                ];
                this.$rootScope.$on("rocks.config.ready", function () {
                    _this.exportFormats = _this.rocksConfigService.config.geoserverWfsExportFormats;
                });
                this.$rootScope.$on("rocks.extent.ready", function (event, data) {
                    _this.step = "selectFeatures";
                    _this.targetExtent = data;
                });
            }
            /**
             * broadcast event to trigger draw, and return extent
             */
            RocksClipShipService.prototype.startDraw = function () {
                this.$rootScope.$broadcast("draw.extent.start", "rocks.extent.ready");
            };
            RocksClipShipService.prototype.openGeoserver = function () {
                var win = window.open(this.rocksConfigService.config.geoserverDashboardUrl, '_blank');
                if (win) {
                    win.focus();
                }
            };
            RocksClipShipService.prototype.updateExportFormat = function (format) {
                this.targetFormat = format;
            };
            return RocksClipShipService;
        })();
        clipShipService.RocksClipShipService = RocksClipShipService;
        angular
            .module('explorer.rockproperties.clipship', [])
            .factory("rocksClipShipService", ["$rootScope", "rocksFiltersService", "rocksConfigService",
            function ($rootScope, rocksFiltersService, rocksConfigService) {
                return new rpComponents.clipShipService.RocksClipShipService($rootScope, rocksFiltersService, rocksConfigService);
            }
        ])
            .controller("rocksClipShipCtrl", RocksClipShipCtrl)
            .directive("rocksClipShip", function () {
            return {
                templateUrl: 'rockprops/clip-ship.html',
                controller: RocksClipShipCtrl,
                controllerAs: 'rocksClipShipVM'
            };
        })
            .filter('noClipSelected', [function ($filter) {
                return function (features) {
                    if (!features)
                        return;
                    for (var i = 0; i < features.length; i++) {
                        if (features[i].isSelected)
                            return false;
                    }
                    return true;
                };
            }]);
    })(clipShipService = rpComponents.clipShipService || (rpComponents.clipShipService = {}));
})(rpComponents || (rpComponents = {}));
/// <reference path="../../typings/tsd.d.ts" />
var rpComponents;
(function (rpComponents) {
    var clusterService;
    (function (clusterService_1) {
        'use strict';
        var RocksClusterFilterCtrl = (function () {
            function RocksClusterFilterCtrl($scope, clusterService, rocksPanelService, rocksFiltersService) {
                this.$scope = $scope;
                this.clusterService = clusterService;
                this.rocksPanelService = rocksPanelService;
                this.rocksFiltersService = rocksFiltersService;
            }
            RocksClusterFilterCtrl.$inject = ["$scope", "clusterService", "rocksPanelService", "rocksFiltersService"];
            return RocksClusterFilterCtrl;
        })();
        clusterService_1.RocksClusterFilterCtrl = RocksClusterFilterCtrl;
        var ClusterService = (function () {
            function ClusterService($http, $rootScope, zoomLevelService, clusterChartService, loadingSpinnerService, rocksConfigService) {
                var _this = this;
                this.$http = $http;
                this.$rootScope = $rootScope;
                this.zoomLevelService = zoomLevelService;
                this.clusterChartService = clusterChartService;
                this.loadingSpinnerService = loadingSpinnerService;
                this.rocksConfigService = rocksConfigService;
                this.clusterRangeMeta = {
                    maxExtrudeHeight: 500000
                };
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
                        if (response.data) {
                            var clusters = response.data;
                            // use d3 to build a scale for our extrude heights; we'll build a diff scale
                            // for each zoom level, as we can't guarantee they'll start at the top and work down
                            _this.clusterRangeMeta.maxCount = d3.max(clusters, function (d) { return d.count; });
                            _this.clusterRangeMeta.scale = d3.scale.linear()
                                .domain([0, _this.clusterRangeMeta.maxCount])
                                .range([0, _this.clusterRangeMeta.maxExtrudeHeight]);
                            for (var i = 0; i < clusters.length; i++) {
                                // tag id with type for pick handling
                                clusters[i]['featureType'] = 'rockPropsCluster';
                                var clusterProps = _this.computeClusterAttributes(clusters[i].count);
                                clusterInstances.push(_this.buildClusterInstance(clusters[i], clusterProps));
                                labelCollection.add(_this.buildLabel(clusters[i], clusterProps));
                            }
                            _this.drawClusters(clusterInstances, labelCollection);
                        }
                        else {
                            console.log("got no clusters");
                            console.log(response);
                        }
                    });
                };
            }
            /**
             *
             * @param viewer
             * @param serviceUrl
             * @param usePicking
             */
            ClusterService.prototype.init = function (viewer) {
                var _this = this;
                this.viewer = viewer;
                this.zoomLevelService.viewer = viewer;
                this.serviceUrl = this.rocksConfigService.config.clusterServiceUrl;
                this.$rootScope.$on('rocks.clusters.update', function () {
                    _this.reCluster();
                });
                // setup our pick handler
                if (this.rocksConfigService.config.useClusterPicking) {
                    this.pickHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
                    this.pickHandlerAction = function (movement) {
                        var pick = _this.viewer.scene.pick(movement.position);
                        // TODO revise cluster pick validation when we decide on format for service
                        if (Cesium.defined(pick) && Cesium.defined(pick.id) && pick.id.hasOwnProperty('featureType') && pick.id.featureType == 'rockPropsCluster') {
                            _this.clearHighlighted();
                            _this.targetId = pick.id;
                            _this.queryCluster(_this.targetId);
                            _this.setHighlighted(_this.targetId, true);
                        }
                    };
                }
            };
            ClusterService.prototype.setHighlighted = function (id, highlight) {
                var attributes = this.clusterPrimitive.getGeometryInstanceAttributes(id);
                if (attributes && highlight) {
                    attributes.prevColor = attributes.color;
                    attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.fromCssColorString('#ff00ff').withAlpha(1));
                }
            };
            ClusterService.prototype.clearHighlighted = function () {
                if (this.targetId) {
                    var attributes = this.clusterPrimitive.getGeometryInstanceAttributes(this.targetId);
                    if (attributes && attributes.hasOwnProperty('prevColor')) {
                        attributes.color = attributes.prevColor;
                    }
                }
            };
            ClusterService.prototype.toggleClusters = function () {
                if (this.clustersCollection) {
                    this.clustersCollection.show = !this.clustersCollection.show;
                    this.zoomLevelService.setActive(this.clustersCollection.show);
                    if (this.clustersCollection.show) {
                        this.pickHandler.setInputAction(this.pickHandlerAction, Cesium.ScreenSpaceEventType.LEFT_CLICK);
                    }
                    else {
                        this.pickHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
                    }
                    this.reCluster();
                }
                else {
                    this.clustersCollection = new Cesium.PrimitiveCollection();
                    this.viewer.scene.primitives.add(this.clustersCollection);
                    this.zoomLevelService.setActive(true);
                    this.reCluster();
                    this.pickHandler.setInputAction(this.pickHandlerAction, Cesium.ScreenSpaceEventType.LEFT_CLICK);
                }
                return this.clustersCollection.show;
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
                    url: this.serviceUrl + "/" + this.zoomLevelService.nextIndex + '.json',
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
             * Gets a summary of cluster data to pass to chartService.
             *
             * @param cluster
             */
            ClusterService.prototype.queryCluster = function (cluster) {
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
                // DEBUG
                // TODO update once establish cluster summary service
                this.$http({
                    method: 'GET',
                    url: this.serviceUrl + '/cluster.json',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: {
                        targetCluster: cluster
                    }
                }).then(function (response) {
                    if (response.hasOwnProperty('data')) {
                        _this.clusterChartService.buildChart(response.data);
                    }
                });
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
                this.clustersCollection.add(this.clusterPrimitive);
                this.clustersCollection.add(labelCollection);
            };
            ClusterService.prototype.buildClusterInstance = function (cluster, clusterProps) {
                return new Cesium.GeometryInstance({
                    geometry: new Cesium.CircleGeometry({
                        center: Cesium.Cartesian3.fromDegrees(cluster.lon, cluster.lat),
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
                    position: Cesium.Cartesian3.fromDegrees(cluster.lon, cluster.lat, 100 + clusterProps.extrudeHeight),
                    text: cluster.count.toString(),
                    fillColor: Cesium.Color.BLACK,
                    outlineColor: Cesium.Color.RED,
                    // TODO review labelling
                    font: (40 - this.zoomLevelService.nextIndex) + 'px arial, sans-serif',
                    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                    id: cluster
                };
            };
            ClusterService.prototype.computeClusterAttributes = function (count) {
                var attrs = {
                    radius: 100000 * (this.zoomLevelService.nextIndex / 10),
                    extrudeHeight: this.clusterRangeMeta.scale(count) * (this.zoomLevelService.nextIndex / 10)
                };
                if (count < 100) {
                    attrs.color = Cesium.Color.fromCssColorString('#4781cd').withAlpha(0.5);
                }
                else if (count >= 10 && count < 1000) {
                    attrs.color = Cesium.Color.fromCssColorString('#0fc70e').withAlpha(0.5);
                }
                else {
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
                "rocksConfigService"
            ];
            return ClusterService;
        })();
        clusterService_1.ClusterService = ClusterService;
        angular
            .module('explorer.rockproperties.clusters', [])
            .controller("rocksClusterFilterCtrl", RocksClusterFilterCtrl)
            .directive("rocksClusterFilters", function () {
            return {
                templateUrl: 'rockprops/cluster-filters.html',
                controller: RocksClusterFilterCtrl,
                controllerAs: 'rocksClusterFilterVM'
            };
        })
            .factory("clusterService", [
            "$http",
            "$rootScope",
            "zoomLevelService",
            "clusterChartService",
            "loadingSpinnerService",
            "rocksConfigService",
            function ($http, $rootScope, zoomLevelService, clusterChartService, chartSpinnerService, rocksConfigService) {
                return new rpComponents.clusterService.ClusterService($http, $rootScope, zoomLevelService, clusterChartService, chartSpinnerService, rocksConfigService);
            }]);
    })(clusterService = rpComponents.clusterService || (rpComponents.clusterService = {}));
})(rpComponents || (rpComponents = {}));
/// <reference path="../../typings/tsd.d.ts" />
var rpComponents;
(function (rpComponents) {
    var config;
    (function (config_1) {
        'use strict';
        var RocksConfigService = (function () {
            function RocksConfigService($rootScope) {
                this.$rootScope = $rootScope;
            }
            RocksConfigService.prototype.setConfig = function (config) {
                this.config = config;
                this.$rootScope.$broadcast("rocks.config.ready");
            };
            RocksConfigService.$inject = [
                "$rootScope"
            ];
            return RocksConfigService;
        })();
        config_1.RocksConfigService = RocksConfigService;
        angular
            .module('explorer.rockproperties.config', [])
            .factory("rocksConfigService", ["$rootScope",
            function ($rootScope) {
                return new rpComponents.config.RocksConfigService($rootScope);
            }]);
    })(config = rpComponents.config || (rpComponents.config = {}));
})(rpComponents || (rpComponents = {}));
/// <reference path="../../typings/tsd.d.ts" />
var rpComponents;
(function (rpComponents) {
    var controlPanel;
    (function (controlPanel) {
        'use strict';
        var RocksPanelCtrl = (function () {
            function RocksPanelCtrl($scope, rocksPanelService) {
                this.$scope = $scope;
                this.rocksPanelService = rocksPanelService;
                this.targetPanel = '';
            }
            RocksPanelCtrl.prototype.setTargetPanel = function (targetPanel) {
                this.targetPanel = (this.targetPanel != targetPanel) ? targetPanel : "";
            };
            RocksPanelCtrl.$inject = ["$scope", "rocksPanelService"];
            return RocksPanelCtrl;
        })();
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
                this.rocksConfigService.setConfig(config);
                this.clusterService.init(viewer);
                this.wmsPointsService.init(viewer);
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
        })();
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
/// <reference path="../../typings/tsd.d.ts" />
var rpComponents;
(function (rpComponents) {
    var filters;
    (function (filters) {
        'use strict';
        var RocksFiltersService = (function () {
            function RocksFiltersService($http, $rootScope, rocksConfigService) {
                var _this = this;
                this.$http = $http;
                this.$rootScope = $rootScope;
                this.rocksConfigService = rocksConfigService;
                this.$inject = [
                    "$http",
                    "$rootScope",
                    "rocksConfigService"
                ];
                // load filter data
                this.$rootScope.$on("rocks.config.ready", function () {
                    $http.get(_this.rocksConfigService.config.filterNamesServiceUrl).then(function (response) {
                        _this.filters = response.data;
                        for (var i = 0; i < _this.filters.length; i++) {
                            if (_this.filters[i].filterType == "PROPERTY") {
                                // set up properties array with flag for export
                                var propertyOptions = angular.copy(_this.filters[i].filterOptions);
                                for (var j = 0; j < propertyOptions.length; j++) {
                                    propertyOptions[j] = {
                                        name: propertyOptions[j],
                                        isSelected: false
                                    };
                                }
                                var properties = angular.copy(_this.filters[i]);
                                properties.filterOptions = propertyOptions;
                                _this.exportProperties = properties;
                            }
                        }
                    }), function (response) {
                        console.log("Failed to get rock props filters");
                        console.log(response);
                    };
                });
            }
            RocksFiltersService.prototype.setAllExportSelected = function (selected) {
                for (var i = 0; i < this.exportProperties.filterOptions.length; i++) {
                    this.exportProperties.filterOptions[i].isSelected = selected;
                }
            };
            return RocksFiltersService;
        })();
        filters.RocksFiltersService = RocksFiltersService;
        angular
            .module('explorer.rockproperties.filters', [])
            .factory("rocksFiltersService", ["$http", "$rootScope", "rocksConfigService",
            function ($http, $rootScope, rocksConfigService) {
                return new rpComponents.filters.RocksFiltersService($http, $rootScope, rocksConfigService);
            }]);
    })(filters = rpComponents.filters || (rpComponents.filters = {}));
})(rpComponents || (rpComponents = {}));
/// <reference path="../../typings/tsd.d.ts" />
/**
 *
 * Geoserver Utils, e.g. get list of layers names from web map service.
 *
 */
var rpComponents;
(function (rpComponents) {
    var gwsUtilService;
    (function (gwsUtilService) {
        'use strict';
        var GwsUtilService = (function () {
            function GwsUtilService($q, $http, rocksConfigService) {
                this.$q = $q;
                this.$http = $http;
                this.rocksConfigService = rocksConfigService;
            }
            GwsUtilService.prototype.getWfsFeatureTypeNames = function () {
                var _this = this;
                var deferred = this.$q.defer();
                this.$http.get(this.rocksConfigService.config.geoserverWfsUrl
                    + '?request=GetCapabilities&service=wfs&version='
                    + this.rocksConfigService.config.geoserverWfsVersion).
                    success(function (data, status, headers, config) {
                    var layerNames = _this.getFeatureTypeNamesFromWfsCapsJson(_this.xmlToJson($.parseXML(data)));
                    deferred.resolve(layerNames);
                }).
                    error(function (err) {
                    console.log("GetCapabilities request failed");
                    console.log(err);
                    deferred.error();
                });
                return deferred.promise;
            };
            GwsUtilService.prototype.getFeatureTypeNamesFromWfsCapsJson = function (data) {
                var layerData = data["wfs:WFS_Capabilities"].FeatureTypeList.FeatureType;
                var layers = [];
                for (var i = 0; i < layerData.length; i++) {
                    layers.push(layerData[i].Name["#text"]);
                }
                return layers;
            };
            GwsUtilService.prototype.getWmsLayerNames = function () {
                var _this = this;
                var deferred = this.$q.defer();
                this.$http.get(this.rocksConfigService.config.geoserverWmsUrl
                    + '?request=GetCapabilities&service=wms&version='
                    + this.rocksConfigService.config.geoserverWmsVersion).
                    success(function (data, status, headers, config) {
                    var layerNames = _this.getLayerNamesFromWmsCapsJson(_this.xmlToJson($.parseXML(data)));
                    deferred.resolve(layerNames);
                }).
                    error(function (err) {
                    console.log("GetCapabilities request failed");
                    console.log(err);
                    deferred.error();
                });
                return deferred.promise;
            };
            GwsUtilService.prototype.getLayerNamesFromWmsCapsJson = function (data) {
                var layerData = data.WMS_Capabilities.Capability.Layer.Layer;
                var layers = [];
                for (var i = 0; i < layerData.length; i++) {
                    layers.push(layerData[i].Name["#text"]);
                }
                return layers;
            };
            GwsUtilService.prototype.xmlToJson = function (xml) {
                var obj = {};
                if (xml.nodeType == 1) {
                    // do attributes
                    if (xml.attributes.length > 0) {
                        obj["@attributes"] = {};
                        for (var j = 0; j < xml.attributes.length; j++) {
                            var attribute = xml.attributes.item(j);
                            obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
                        }
                    }
                }
                else if (xml.nodeType == 3) {
                    obj = xml.nodeValue;
                }
                // do children
                if (xml.hasChildNodes()) {
                    for (var i = 0; i < xml.childNodes.length; i++) {
                        var item = xml.childNodes.item(i);
                        var nodeName = item.nodeName;
                        if (typeof (obj[nodeName]) == "undefined") {
                            obj[nodeName] = this.xmlToJson(item);
                        }
                        else {
                            if (typeof (obj[nodeName].push) == "undefined") {
                                var old = obj[nodeName];
                                obj[nodeName] = [];
                                obj[nodeName].push(old);
                            }
                            obj[nodeName].push(this.xmlToJson(item));
                        }
                    }
                }
                return obj;
            };
            GwsUtilService.$inject = [
                "$q",
                "$http",
                "rocksConfigService"
            ];
            return GwsUtilService;
        })();
        gwsUtilService.GwsUtilService = GwsUtilService;
        angular
            .module('explorer.rockproperties.gwsutil', [])
            .factory("gwsUtilService", ["$q", "$http", "rocksConfigService",
            function ($q, $http, rocksConfigService) {
                return new rpComponents.gwsUtilService.GwsUtilService($q, $http, rocksConfigService);
            }]);
    })(gwsUtilService = rpComponents.gwsUtilService || (rpComponents.gwsUtilService = {}));
})(rpComponents || (rpComponents = {}));
/// <reference path="../../typings/tsd.d.ts" />
var rpComponents;
(function (rpComponents) {
    var pointsService;
    (function (pointsService) {
        'use strict';
        var RocksWmsPointsCtrl = (function () {
            function RocksWmsPointsCtrl($scope, wmsPointsService, rocksPanelService) {
                this.$scope = $scope;
                this.wmsPointsService = wmsPointsService;
                this.rocksPanelService = rocksPanelService;
            }
            RocksWmsPointsCtrl.$inject = ["$scope", "wmsPointsService", "rocksPanelService"];
            return RocksWmsPointsCtrl;
        })();
        pointsService.RocksWmsPointsCtrl = RocksWmsPointsCtrl;
        var WmsPointsService = (function () {
            function WmsPointsService(gwsUtilService, rocksConfigService) {
                this.gwsUtilService = gwsUtilService;
                this.rocksConfigService = rocksConfigService;
                this.masterChecked = true;
                this.legendParamString = "";
                this.$inject = [
                    "gwsUtilService",
                    "rocksConfigService"
                ];
            }
            WmsPointsService.prototype.init = function (viewer) {
                var _this = this;
                this.wmsServiceUrl = this.rocksConfigService.config.geoserverWmsUrl;
                this.viewer = viewer;
                this.restrictedBounds = Cesium.Rectangle.fromDegrees(109, -45, 158, -8);
                // build our legend param string from config
                this.legendParamString = "?";
                angular.forEach(this.rocksConfigService.config.geoserverWmsLegendParams, function (value, key) {
                    _this.legendParamString += key + "=" + value + "&";
                });
                // lose trailing &
                this.legendParamString = this.legendParamString.slice(0, -1) + "&LAYER=";
                this.gwsUtilService.getWmsLayerNames().then(function (layers) {
                    _this.layers = layers;
                    _this.getLegendData();
                });
            };
            WmsPointsService.prototype.togglePoints = function () {
                this.pointsVisible = !this.pointsVisible;
                if (this.wmsLayer) {
                    this.wmsLayer.show = this.pointsVisible;
                }
                else {
                    this.updatePointsLayer();
                }
                return this.pointsVisible;
            };
            WmsPointsService.prototype.toggleChecked = function () {
                this.masterChecked != this.masterChecked;
                for (var legend in this.legendData) {
                    this.legendData[legend]['isSelected'] = this.masterChecked;
                }
            };
            WmsPointsService.prototype.getLegendData = function () {
                this.legendData = {};
                for (var i = 0; i < this.layers.length; i++) {
                    this.legendData[this.layers[i]] = {
                        legendUrl: this.wmsServiceUrl + this.legendParamString + this.layers[i],
                        isSelected: true
                    };
                }
            };
            WmsPointsService.prototype.updatePointsLayer = function () {
                var targetLayers = [];
                for (var legend in this.legendData) {
                    if (this.legendData.hasOwnProperty(legend) && this.legendData[legend]['isSelected'] === true) {
                        targetLayers.push(legend);
                    }
                }
                if (this.wmsLayer) {
                    this.viewer.imageryLayers.remove(this.wmsLayer);
                }
                this.wmsLayer = this.viewer.imageryLayers.addImageryProvider(new Cesium.WebMapServiceImageryProvider({
                    url: this.wmsServiceUrl,
                    layers: targetLayers.toString(),
                    rectangle: this.restrictedBounds,
                    parameters: {
                        transparent: 'true',
                        format: 'image/png'
                    },
                    enablePickFeatures: false
                }));
                this.wmsLayer.alpha = 0.7;
            };
            return WmsPointsService;
        })();
        pointsService.WmsPointsService = WmsPointsService;
        angular
            .module('explorer.rockproperties.wmspoints', [])
            .factory("wmsPointsService", ["gwsUtilService", "rocksConfigService",
            function (gwsUtilService, rocksConfigService) {
                return new rpComponents.pointsService.WmsPointsService(gwsUtilService, rocksConfigService);
            }])
            .controller("rocksWmsPointsCtrl", RocksWmsPointsCtrl)
            .directive("rocksWmsPointsLegend", function () {
            return {
                templateUrl: 'rockprops/points-legend.html',
                controller: RocksWmsPointsCtrl,
                controllerAs: 'rocksWmsPointsVM'
            };
        });
    })(pointsService = rpComponents.pointsService || (rpComponents.pointsService = {}));
})(rpComponents || (rpComponents = {}));
/// <reference path="../../typings/tsd.d.ts" />
var rpComponents;
(function (rpComponents) {
    var queryBuilderExport;
    (function (queryBuilderExport) {
        'use strict';
        var QueryBuilder = (function () {
            function QueryBuilder($q, $http, $rootScope, loadingSpinnerService, rocksClipShipService, rocksConfigService, gwsUtilService) {
                var _this = this;
                this.$q = $q;
                this.$http = $http;
                this.$rootScope = $rootScope;
                this.loadingSpinnerService = loadingSpinnerService;
                this.rocksClipShipService = rocksClipShipService;
                this.rocksConfigService = rocksConfigService;
                this.gwsUtilService = gwsUtilService;
                this.propertyQuery = "";
                this.$inject = [
                    "$q",
                    "$http",
                    "$rootScope",
                    "loadingSpinnerService",
                    "rocksClipShipService",
                    "rocksConfigService",
                    "gwsUtilService"
                ];
                this.$rootScope.$on("rocks.config.ready", function () {
                    // build base query URL from config
                    _this.baseUrl = _this.rocksConfigService.config.geoserverWfsUrl + "?";
                    angular.forEach(_this.rocksConfigService.config.geoserverWfsExportParams, function (value, key) {
                        _this.baseUrl += key + "=" + value + "&";
                    });
                    // lose trailing &
                    _this.baseUrl = _this.baseUrl.slice(0, -1);
                    // get WFS layer names
                    _this.gwsUtilService.getWfsFeatureTypeNames().then(function (layerNames) {
                        _this.wfsLayerNames = layerNames;
                    });
                });
            }
            QueryBuilder.prototype.startClipShip = function (features, format, extent) {
                var _this = this;
                // TODO fire flasher event for UI?
                this.loading = true;
                // init spinner
                if (!this.loadingSpinner) {
                    this.loadingSpinner = this.loadingSpinnerService.addSpinner({
                        width: 80,
                        height: 80,
                        container: "#rock-clip-ship-loading",
                        id: "clip-ship-spinner"
                    });
                    this.loadingSpinner();
                }
                var targetFeatures = [];
                for (var i = 0; i < features.length; i++) {
                    if (features[i].isSelected)
                        targetFeatures.push(features[i].name);
                }
                if (format === "csv") {
                    var zip = new JSZip();
                    // give zip file to decent browsers
                    if (JSZip.support.blob) {
                        //showLoading = true;
                        var promises = [];
                        console.log("this.wfsLayerNames");
                        console.log(this.wfsLayerNames);
                        // create a Get query for each layer
                        for (var i = 0; i < this.wfsLayerNames.length; i++) {
                            var query = this.buildQuery(targetFeatures, extent, format, [this.wfsLayerNames[i]]);
                            var promise = this.$http.get(query);
                            promises.push(promise);
                        }
                        this.$q.all(promises).then(function (results) {
                            for (var i = 0; i < results.length; i++) {
                                // we'll assume that if there's more than one line we've got data to write
                                var numberOfLineBreaks = (results[i]['data'].match(/\n/g) || []).length;
                                if (numberOfLineBreaks > 1) {
                                    var filename = _this.wfsLayerNames[i].split(' ').join('-');
                                    zip.file(filename + ".csv", results[i]['data'] + "\n");
                                }
                            }
                            // FileSaver.js
                            var content = zip.generate({ type: "blob" });
                            saveAs(content, "rocks-export.zip");
                            _this.loading = false;
                            _this.rocksClipShipService.step = 'startDraw';
                        });
                    }
                    else {
                        // just give separate file for each layer
                        for (var i = 0; i < this.wfsLayerNames.length; i++) {
                            window.open(this.buildQuery(targetFeatures, extent, format, [this.wfsLayerNames[i]]));
                        }
                        this.loading = false;
                    }
                }
                else {
                    // give the user the query url directly
                    this.exportUrl = this.buildQuery(targetFeatures, extent, format, this.wfsLayerNames);
                    this.loading = false;
                }
            };
            QueryBuilder.prototype.buildQuery = function (properties, extent, format, layerNames) {
                var typeNamesQuery = this.getTypeNamesQuery(layerNames);
                // BBOX and FILTER queries are mutually exclusive, so must use CQL
                var bboxQuery = "&CQL_FILTER=BBOX(GEOM," + extent.west + "," + extent.south + "," + extent.east + "," + extent.north + ")";
                var filterQuery = "";
                var filters = {}; // filterState.filters;
                var exportFormat = "&outputFormat=" + format;
                var query;
                var hasFilters = !isEmpty(filters);
                var filtersHasProperty = filters.hasOwnProperty("PROPERTY");
                var onlyHasPropertyFilter = (filtersHasProperty && (Object.keys(filters).length === 1)) ? true : false;
                function isEmpty(obj) {
                    for (var prop in obj) {
                        if (obj.hasOwnProperty(prop))
                            return false;
                    }
                    return true;
                }
                // single feature/layer query with filters
                if (hasFilters && filtersHasProperty) {
                    this.propertyQuery = "%20AND%20PROPERTY='" + filters['PROPERTY'] + "'";
                    if (!onlyHasPropertyFilter) {
                        filterQuery = this.getFilters(filters);
                    }
                }
                else if (hasFilters) {
                    this.propertyQuery = this.getPropertyQuery(properties);
                    if (!onlyHasPropertyFilter) {
                        filterQuery = this.getFilters(filters);
                    }
                }
                else {
                    this.propertyQuery = this.getPropertyQuery(properties);
                }
                //ga('send', 'event', 'explorer-rock-properties', 'click', 'data export: '+ format);
                query = this.baseUrl + typeNamesQuery + exportFormat + bboxQuery + filterQuery + this.propertyQuery;
                return query;
            };
            // create filter query for each of the selected attribute values
            // don't include PROPERTY here as we want to apply OR logic
            QueryBuilder.prototype.getFilters = function (filters) {
                var filterString = "%20AND%20";
                // create filters string
                for (var property in filters) {
                    if (property !== "PROPERTY") {
                        filterString = filterString.concat(property + "='" + filters[property] + "'%20AND%20");
                    }
                }
                // trim tailing AND
                filterString = filterString.substring(0, filterString.length - 9);
                return filterString;
            };
            // build CQL query for properties
            QueryBuilder.prototype.getPropertyQuery = function (properties) {
                var query = "%20AND%20(";
                for (var i = 0; i < properties.length; i++) {
                    query = query.concat("PROPERTY='" + properties[i] + "'%20OR%20");
                }
                // trim trailing OR, close bracket
                query = query.substring(0, query.length - 8);
                query = query.concat(")");
                return query;
            };
            QueryBuilder.prototype.getTypeNamesQuery = function (layers) {
                var query = "&typeName=";
                for (var i = 0; i < layers.length; i++) {
                    query = query.concat(layers[i] + ",");
                }
                query = query.substring(0, query.length - 1);
                return query;
            };
            return QueryBuilder;
        })();
        queryBuilderExport.QueryBuilder = QueryBuilder;
        angular
            .module('explorer.rockproperties.queryexport', [])
            .factory("rocksQueryBuilderExport", [
            "$q",
            "$http",
            "$rootScope",
            "loadingSpinnerService",
            "rocksClipShipService",
            "rocksConfigService",
            "gwsUtilService",
            function ($q, $http, $rootScope, loadingSpinnerService, rocksClipShipService, rocksConfigService, gwsUtilService) {
                return new rpComponents.queryBuilderExport.QueryBuilder($q, $http, $rootScope, loadingSpinnerService, rocksClipShipService, rocksConfigService, gwsUtilService);
            }]);
    })(queryBuilderExport = rpComponents.queryBuilderExport || (rpComponents.queryBuilderExport = {}));
})(rpComponents || (rpComponents = {}));
/// <reference path="../../typings/tsd.d.ts" />
/**
 * Simple loading spinner so we're not tied to any img/icon font's
 */
var rpComponents;
(function (rpComponents) {
    var spinnerService;
    (function (spinnerService) {
        'use strict';
        var LoadingSpinnerService = (function () {
            function LoadingSpinnerService() {
            }
            LoadingSpinnerService.prototype.addSpinner = function (config) {
                return function () {
                    var radius = Math.min(config.width, config.height) / 2;
                    var tau = 2 * Math.PI;
                    var arc = d3.svg.arc()
                        .innerRadius(radius * 0.5)
                        .outerRadius(radius * 0.9)
                        .startAngle(0);
                    var svg = d3.select(config.container).append("svg")
                        .attr("id", config.id)
                        .attr("width", config.width)
                        .attr("height", config.height)
                        .append("g")
                        .attr("transform", "translate(" + config.width / 2 + "," + config.height / 2 + ")");
                    svg.append("path")
                        .datum({ endAngle: 0.33 * tau })
                        .style("fill", "#4D4D4D")
                        .attr("d", arc)
                        .call(spin, 1500);
                    function spin(selection, duration) {
                        selection.transition()
                            .ease("linear")
                            .duration(duration)
                            .attrTween("transform", function () {
                            return d3.interpolateString("rotate(0)", "rotate(360)");
                        });
                        setTimeout(function () { spin(selection, duration); }, duration);
                    }
                };
            };
            return LoadingSpinnerService;
        })();
        spinnerService.LoadingSpinnerService = LoadingSpinnerService;
        angular
            .module('explorer.rockproperties.spinner', [])
            .factory("loadingSpinnerService", [function () { return new rpComponents.spinnerService.LoadingSpinnerService(); }]);
    })(spinnerService = rpComponents.spinnerService || (rpComponents.spinnerService = {}));
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
        angular
            .module('explorer.rockproperties.zoom', [])
            .factory("zoomLevelService", ["$rootScope",
            function ($rootScope) { return new rpComponents.zoom.ZoomLevelService($rootScope); }]);
    })(zoom = rpComponents.zoom || (rpComponents.zoom = {}));
})(rpComponents || (rpComponents = {}));
angular.module("explorer.rockproperties.templates", []).run(["$templateCache", function ($templateCache) {
        $templateCache.put("rockprops/clip-ship.html", "\n<div ng-show=\"rocksClipShipVM.rocksClipShipService.step == \'startDraw\'\">\n	<h6 class=\"dis-inline\">\n		1.\n		<button ng-click=\"rocksClipShipVM.rocksClipShipService.startDraw()\" style=\"padding: 5px 10px;border-radius: 3px;border: none;\">\n			Click here\n		</button>\n		to select an area on the map <i class=\"fa fa-scissors\" style=\"font-size: 16px;\"></i></h6>\n</div>\n\n\n<div ng-show=\"rocksClipShipVM.rocksClipShipService.step == \'selectFeatures\'\">\n\n	<h6 class=\"dis-inline\">2. Select features to download:</h6>\n\n	<div>\n\n		<!-- if we have active property filters, use them instead -->\n		<p ng-show=\"hasAnyFilter\">\n			<i class=\"fa fa-info-circle\"></i> Current filters will be applied to the exported data.\n		</p>\n\n		<div ng-hide=\"hasAnyFilter\">\n\n			<div style=\"padding: 5px; margin-top: 10px; background: #f0f0f0; border-radius: 3px;\">\n				<label>\n					<input type=\"checkbox\" ng-model=\"masterCheck\" ng-disabled=\"hasPropertyFilter\" ng-change=\"rocksClipShipVM.rocksFiltersService.setAllExportSelected(masterCheck)\" />\n					{{ masterCheck ? \'Deselect\' : \'Select\' }} All\n				</label>\n			</div>\n\n			<label style=\"margin-left: 25px;\" class=\"checkbox\" ng-repeat=\"property in rocksClipShipVM.rocksFiltersService.exportProperties.filterOptions\">\n				<input type=\"checkbox\" value=\"property.isSelected\" ng-model=\"property.isSelected\" ng-checked=\"masterCheck\" ng-disabled=\"hasPropertyFilter\">\n				{{ property.name }}\n			</label>\n\n		</div>\n\n		<div style=\"margin: 20px 0px 20px 0px;\">\n			<label title=\"Export Format\">Export Format</label>\n			<select ng-change=\"rocksClipShipVM.rocksClipShipService.updateExportFormat(exportFormats.SelectedOption)\"\n					ng-model=\"exportFormats.SelectedOption\"\n					name=\"format\"\n					ng-options=\"option for option in rocksClipShipVM.rocksClipShipService.exportFormats\"\n					ng-class=\"form-control\"\n					class=\"filter-input\"\n					style=\"float: right; width: 160px;\">\n				<option value=\"\" class=\"\">--select--</option>\n			</select>\n		</div>\n\n		<a ng-click=\"rocksClipShipVM.rocksClipShipService.openGeoserver()\" style=\"font-size: 11px; margin-top: 20px; color: blue; text-decoration: underline;\">\n			More Options via GeoServer Dashboard\n		</a>\n\n		<div style=\"margin-top: 20px;\">\n			<button type=\"button\" class=\"btn btn-default\" ng-click=\"rocksClipShipVM.rocksClipShipService.step = \'startDraw\'\" title=\"Cancel Download\" style=\"width: 40%; float: left;\">Cancel</button>\n			<button type=\"button\"\n					class=\"btn btn-default focusMe\"\n					ng-click=\"rocksClipShipVM.startClipShip()\"\n					style=\"width: 40%; float: right\"\n					title=\"Select one or more reference feature classes before continuing.\"\n					ng-disabled=\"(rocksClipShipVM.rocksFiltersService.exportProperties.filterOptions | noClipSelected) || (!rocksClipShipVM.rocksClipShipService.targetFormat)\">Next</button>\n		</div>\n\n	</div>\n\n</div>\n\n<div ng-show=\"rocksClipShipVM.rocksClipShipService.step == \'download\'\">\n\n	<h6>3. Data Export:</h6>\n\n	<div ng-hide=\"rocksClipShipVM.rocksQueryBuilderExport.loading\">\n\n		<p ng-show=\"rocksClipShipVM.rocksClipShipService.targetFormat === \'application/json\'\" style=\"margin-top: 40px;\">\n			<i class=\"fa fa-info-circle\"></i> Once json has loaded, save page as a .json file.\n		</p>\n\n		<p class=\"warning-block\" style=\"margin-top: 20px;\">\n			<i class=\"fa fa-info-circle\"></i> Large data sets may take several minutes to export.\n		</p>\n\n		<a class=\"btn btn-default\" target=\"_blank\" href=\"{{rocksClipShipVM.rocksQueryBuilderExport.exportUrl}}\" ng-click=\"rocksClipShipVM.rocksClipShipService.step = \'startDraw\'\" style=\"width: 100%; margin-top: 30px;\" role=\"button\">\n			<i class=\"fa fa-download\"></i> Download {{ rocksClipShipVM.rocksClipShipService.targetFormat }}\n		</a>\n\n		<a class=\"btn btn-default\" href=\"javascript:;\" ng-click=\"rocksClipShipVM.rocksClipShipService.step = \'selectFeatures\'\" style=\"width: 100%; margin-top: 10px;\" role=\"button\">\n			<i class=\"fa fa-arrow-left\"></i> Back\n		</a>\n\n	</div>\n\n</div>\n\n<div id=\"rock-clip-ship-loading\" ng-show=\"rocksClipShipVM.rocksQueryBuilderExport.loading\">\n	<p>Preparing Data..</p>\n</div>");
        $templateCache.put("rockprops/cluster-filters.html", "\n<!--\n\nTODO plug into rock props filter service\n\n-->\n\n<h5>Filters:</h5>\n\n<div ng-repeat=\"filter in rocksClusterFilterVM.rocksFiltersService.filters\" style=\"padding-top:7px;position:relative; overflow-x: hidden;overflow-y: auto;\">\n\n	<label style=\"font-size: 11px;\" title=\"{{filter.filterLabel}}\">{{filter.filterLabel}}</label>\n	<select\n			ng-change=\"filterChanged(filter.filterType, filter.SelectedOption)\"\n			ng-model=\"filter.SelectedOption\"\n			name=\"filter.filterType\"\n			ng-options=\"option as option for option in filter.filterOptions\"\n			ng-class=\'form-control\'\n			class=\'filter-input\'\n			style=\"float:left;width:100%;position:relative;\">\n		<option value=\"\" selected>--select--</option>\n	</select>\n\n</div>\n\n<div style=\"text-align: center;\">\n	<a class=\"btn btn-default\" style=\"margin: 10px;\" ng-click=\"applyFilters()\" href=\"javascript:;\" ng-disabled=\"!rocksClusterFilterVM.rocksPanelService.clustersEnabled\">\n		<i class=\"fa fa-filter fa-lg\"></i>\n		Apply\n	</a>\n\n	<a class=\"btn btn-default\" style=\"margin: 10px;\" ng-click=\"clearFilters()\" href=\"javascript:;\" ng-disabled=\"!rocksClusterFilterVM.rocksPanelService.clustersEnabled\">\n		<i class=\"fa fa-remove fa-lg\"></i>\n		Clear\n	</a>\n\n	<p ng-show=\"filterResultCount()\" style=\"text-align: left; margin: 10px; font-size: 14px;\">\n		<strong>Record Count: </strong>\n		14320\n	</p>\n</div>\n");
        $templateCache.put("rockprops/cluster-summary.html", "<div id=\"clusterSummaryChart\" ng-show=\"chartState.targetChartId == \'clusterSummaryChart\'\">\n\n	<div class=\"btn-group\" style=\"position: absolute;right: 10px;top: 10px;\">\n		<button type=\"button\" class=\"btn btn-default\" title=\"Close charts\" ng-click=\"clusterChartVM.clusterChartService.hideChart(); clusterChartVM.clusterService.clearHighlighted();\">\n			<i class=\"fa fa-times-circle\" role=\"presentation\" style=\"font-size:16px; color:black\"></i>\n		</button>\n	</div>\n\n	<div id=\"cluster-summary-chart-d3\"></div>\n	<div id=\"cluster-summary-chart-loading\"></div>\n\n</div>");
        $templateCache.put("rockprops/control-panel.html", "<div>\n\n	<div class=\"rocks-accordion\">\n		<div class=\"rocks-toggle-button\" title=\"Show/hide cluster features\">\n			<input type=\"checkbox\" ng-model=\"controlPanelVM.rocksPanelService.clustersEnabled\" ng-change=\"controlPanelVM.rocksPanelService.toggleClusters()\" />\n		</div>\n		<button class=\"title\" ng-click=\"controlPanelVM.setTargetPanel(\'clusterFeatures\')\">\n			<i class=\"fa fa-{{ controlPanelVM.targetPanel == \'clusterFeatures\' ? \'minus\' : \'plus\' }}\"></i>\n			Cluster Features\n		</button>\n	</div>\n	<div class=\"rocks-accordion-content\" ng-show=\"controlPanelVM.targetPanel == \'clusterFeatures\'\">\n\n		<rocks-cluster-filters></rocks-cluster-filters>\n\n	</div>\n\n	<div class=\"rocks-accordion\">\n		<div class=\"rocks-toggle-button\" title=\"Show/hide point features WMS layer\">\n			<input type=\"checkbox\" ng-model=\"controlPanelVM.rocksPanelService.pointsEnabled\" ng-change=\"controlPanelVM.rocksPanelService.togglePoints()\" />\n		</div>\n		<div class=\"title\" ng-click=\"controlPanelVM.setTargetPanel(\'pointFeatures\')\">\n			<i class=\"fa fa-{{ controlPanelVM.targetPanel == \'pointFeatures\' ? \'minus\' : \'plus\' }}\"></i>\n			Point Features (WMS)\n		</div>\n	</div>\n\n	<div class=\"rocks-accordion-content\" ng-show=\"controlPanelVM.targetPanel == \'pointFeatures\'\">\n\n		<rocks-wms-points-legend></rocks-wms-points-legend>\n\n	</div>\n\n	<div class=\"rocks-accordion\">\n		<div class=\"title w100\" ng-click=\"controlPanelVM.setTargetPanel(\'clipShip\')\">\n			<i class=\"fa fa-{{ controlPanelVM.targetPanel == \'clipShip\' ? \'minus\' : \'plus\' }}\"></i>\n			Download Rock Property Data\n		</div>\n	</div>\n\n	<div class=\"rocks-accordion-content\" ng-show=\"controlPanelVM.targetPanel == \'clipShip\'\">\n\n		<rocks-clip-ship></rocks-clip-ship>\n\n	</div>\n\n</div>");
        $templateCache.put("rockprops/points-legend.html", "\n<div style=\"padding: 5px 10px; margin-left: -10px; background: #f0f0f0; border-radius: 3px;\">\n	<label>\n		<input\n			type=\"checkbox\"\n			ng-model=\"rocksWmsPointsVM.wmsPointsService.masterChecked\"\n			ng-change=\"rocksWmsPointsVM.wmsPointsService.toggleChecked()\"\n			ng-disabled=\"!rocksWmsPointsVM.rocksPanelService.pointsEnabled\"/>\n		{{ rocksWmsPointsVM.wmsPointsService.masterChecked ? \'Deselect\' : \'Select\' }} All\n	</label>\n</div>\n\n<div ng-repeat=\"legend in rocksWmsPointsVM.wmsPointsService.legendData\" class=\'rocks-points-legend-item\'>\n\n	<label>\n		<input\n		type=\"checkbox\"\n		ng-model=\"legend.isSelected\"\n		ng-disabled=\"!rocksWmsPointsVM.rocksPanelService.pointsEnabled\" />\n		<img ng-src=\"{{legend.legendUrl}}\" alt=\"{{legend}} legend icon\" />\n	</label>\n\n</div>\n\n<a class=\"btn btn-default\"\n   style=\"width: 100%; margin-top: 20px\"\n   ng-click=\"rocksWmsPointsVM.wmsPointsService.updatePointsLayer()\"\n   ng-disabled=\"!rocksWmsPointsVM.rocksPanelService.pointsEnabled\"\n   href=\"javascript:;\">\n	<i class=\"fa fa-refresh fa-lg\"></i>\n	Update\n</a>");
    }]);
