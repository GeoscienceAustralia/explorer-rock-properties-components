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
            ClusterChartService.prototype.buildChart = function (data) {
                document.getElementById("cluster-summary-chart-d3").innerHTML = "";
                // trigger open/display a chart div
                this.$rootScope.$broadcast("chart.update", {
                    targetChartId: "clusterSummaryChart"
                });
                /*---------------------------------------- D3 -----------------------------------------*/
                //'resources/mock-service/explorer-cossap-services/service/rock-properties/clusters/',
                d3.json('resources/mock-service/explorer-cossap-services/service/rock-properties/clusters/cluster.json', function (error, dataset) {
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
        // ng register
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
            function ClusterService($http, $rootScope, zoomLevelService, clusterChartService, chartSpinnerService) {
                var _this = this;
                this.$http = $http;
                this.$rootScope = $rootScope;
                this.zoomLevelService = zoomLevelService;
                this.clusterChartService = clusterChartService;
                this.chartSpinnerService = chartSpinnerService;
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
            /**
             *
             * @param viewer
             * @param serviceUrl
             * @param usePicking
             */
            ClusterService.prototype.init = function (viewer, serviceUrl, usePicking) {
                var _this = this;
                this.viewer = viewer;
                this.zoomLevelService.viewer = viewer;
                this.serviceUrl = serviceUrl;
                this.$rootScope.$on('rocks.clusters.update', function () {
                    _this.reCluster();
                });
                // disable picking if you don't need charts
                if (usePicking) {
                    this.pickHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
                    this.pickHandlerAction = function (movement) {
                        // TODO revise cluster pick validation when we decide on format for service
                        var pick = _this.viewer.scene.pick(movement.position);
                        if (Cesium.defined(pick) && pick.hasOwnProperty('id') && pick.id.hasOwnProperty('lat')) {
                            //if(this.targetId) this.setHighlighted(this.targetId, false);
                            _this.clearHighlighted();
                            _this.targetId = pick.id;
                            _this.queryCluster(_this.targetId);
                            _this.setHighlighted(_this.targetId, true);
                        }
                    };
                    this.pickHandler.setInputAction(this.pickHandlerAction, Cesium.ScreenSpaceEventType.LEFT_CLICK);
                }
            };
            ClusterService.prototype.setHighlighted = function (id, highlight) {
                var attributes = this.clusterPrimitive.getGeometryInstanceAttributes(id);
                if (attributes && highlight) {
                    attributes.prevColor = attributes.color;
                    attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.fromCssColorString('#F5ED05').withAlpha(1));
                }
                //else if(attributes && attributes.hasOwnProperty('prevColor')) {
                //    attributes.color = attributes.prevColor;
                //}
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
                    this.summarySpinner = this.chartSpinnerService.addSpinner({
                        width: 100,
                        height: 100,
                        container: "#cluster-summary-chart-loading",
                        id: "chart-spinner"
                    });
                    this.summarySpinner();
                }
                // debug
                this.$http({
                    method: 'GET',
                    url: this.serviceUrl + 'cluster-summary.json',
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
            ClusterService.prototype.drawClusters = function (sphereInstances, labelCollection) {
                this.clustersCollection.removeAll();
                this.clusterPrimitive = new Cesium.Primitive({
                    geometryInstances: sphereInstances,
                    appearance: new Cesium.PerInstanceColorAppearance({
                        translucent: true,
                        closed: true
                    })
                });
                this.clustersCollection.add(this.clusterPrimitive);
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
                    return {
                        size: 10000 * this.zoomLevelService.nextIndex,
                        color: Cesium.Color.fromCssColorString('#4781cd').withAlpha(0.5)
                    };
                }
                else if (count >= 10 && count < 1000) {
                    return {
                        size: 10000 * this.zoomLevelService.nextIndex,
                        color: Cesium.Color.fromCssColorString('#0fc70e').withAlpha(0.5)
                    };
                }
                else {
                    return {
                        size: 10000 * this.zoomLevelService.nextIndex,
                        color: Cesium.Color.fromCssColorString('#ff0000').withAlpha(0.5)
                    };
                }
            };
            ClusterService.$inject = [
                "$http",
                "$rootScope",
                "zoomLevelService",
                "clusterChartService",
                "chartSpinnerService"
            ];
            return ClusterService;
        })();
        clusterService.ClusterService = ClusterService;
        // ng register
        angular
            .module('explorer.rockproperties.clusters', [])
            .factory("clusterService", ["$http", "$rootScope", "zoomLevelService", "clusterChartService", "chartSpinnerService",
            function ($http, $rootScope, zoomLevelService, clusterChartService, chartSpinnerService) {
                return new rpComponents.clusterService.ClusterService($http, $rootScope, zoomLevelService, clusterChartService, chartSpinnerService);
            }]);
    })(clusterService = rpComponents.clusterService || (rpComponents.clusterService = {}));
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
        var ChartSpinnerService = (function () {
            function ChartSpinnerService() {
            }
            ChartSpinnerService.prototype.addSpinner = function (config) {
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
            return ChartSpinnerService;
        })();
        spinnerService.ChartSpinnerService = ChartSpinnerService;
        // ng register
        angular
            .module('explorer.rockproperties.spinner', [])
            .factory("chartSpinnerService", [function () { return new rpComponents.spinnerService.ChartSpinnerService(); }]);
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
        // ng register
        angular
            .module('explorer.rockproperties.zoom', [])
            .factory("zoomLevelService", ["$rootScope",
            function ($rootScope) { return new rpComponents.zoom.ZoomLevelService($rootScope); }]);
    })(zoom = rpComponents.zoom || (rpComponents.zoom = {}));
})(rpComponents || (rpComponents = {}));
angular.module("explorer.rockproperties.templates", []).run(["$templateCache", function ($templateCache) { $templateCache.put("rockprops/cluster-summary.html", "<div id=\"clusterSummaryChart\" ng-show=\"cossapChartState.targetChartId == \'clusterSummaryChart\'\">\n\n	<div class=\"btn-group\" style=\"position: absolute;right: 10px;top: 10px;\">\n		<button type=\"button\" class=\"btn btn-default\" title=\"Close graphs\" ng-click=\"clusterChartVM.clusterChartService.hideChart(); clusterChartVM.clusterService.clearHighlighted();\">\n			<i class=\"fa fa-times-circle\" role=\"presentation\" style=\"font-size:16px; color:black\"></i>\n		</button>\n	</div>\n\n\n	<div id=\"cluster-summary-chart-d3\"></div>\n\n	<div id=\"cluster-summary-chart-loading\"></div>\n\n</div>"); }]);
