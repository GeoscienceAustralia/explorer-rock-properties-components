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
        }());
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
            ClusterChartService.prototype.buildChart = function (dataset) {
                document.getElementById("cluster-summary-chart-d3").innerHTML = "";
                // trigger open/display a chart div
                this.$rootScope.$broadcast("chart.update", {
                    targetChartId: "clusterSummaryChart"
                });
                // push data into array for d3 charting
                var properties = [];
                angular.forEach(dataset.properties, function (property, key) {
                    var propertyData = [];
                    angular.forEach(property, function (attribute, attKey) {
                        propertyData.push({ attributeName: attKey, count: attribute });
                    });
                    properties.push({ propertyName: key, data: propertyData });
                });
                /*---------------------------------------- D3 -----------------------------------------*/
                // LAYOUT
                var minWidth = 1250;
                var minHeight = 255;
                var numberOfCharts = (properties.length < 7) ? properties.length : 4; // use two rows if we get too many properties
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
                properties.forEach(function (property) {
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
        }());
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
        }());
        clipShipService.RocksClipShipCtrl = RocksClipShipCtrl;
        var RocksClipShipService = (function () {
            function RocksClipShipService($rootScope, rocksFiltersService, rocksConfigService) {
                var _this = this;
                this.$rootScope = $rootScope;
                this.rocksFiltersService = rocksFiltersService;
                this.rocksConfigService = rocksConfigService;
                this.step = "startDraw";
                this.isDrawing = false;
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
                this.isDrawing = true;
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
        }());
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
    var filters;
    (function (filters) {
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
        }());
        filters.RocksClusterFilterCtrl = RocksClusterFilterCtrl;
        var ClusterFilterState = (function () {
            function ClusterFilterState() {
                this.filterQuery = '';
            }
            return ClusterFilterState;
        }());
        filters.ClusterFilterState = ClusterFilterState;
        var RocksFiltersService = (function () {
            function RocksFiltersService($http, $rootScope, rocksConfigService, clusterService, clusterFilterState) {
                var _this = this;
                this.$http = $http;
                this.$rootScope = $rootScope;
                this.rocksConfigService = rocksConfigService;
                this.clusterService = clusterService;
                this.clusterFilterState = clusterFilterState;
                this.clusterFilters = {};
                this.$inject = [
                    "$http",
                    "$rootScope",
                    "rocksConfigService",
                    "clusterService",
                    "clusterFilterState"
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
            RocksFiltersService.prototype.applyFilters = function () {
                this.clusterFilterState.filterQuery = this.buildFilterQuery();
                this.clusterService.reCluster();
                ga('send', 'event', 'explorer-rock-properties', 'click', 'cluster filters applied');
            };
            RocksFiltersService.prototype.buildFilterQuery = function () {
                var query = '';
                for (var i = 0; i < this.filters.length; i++) {
                    if (this.filters[i].hasOwnProperty('ClusterOption') && this.filters[i].ClusterOption != false) {
                        query = query + '&filter=' + encodeURIComponent(this.filters[i].filterType + '=' + this.filters[i].ClusterOption);
                    }
                }
                return query;
            };
            RocksFiltersService.prototype.clearFilters = function () {
                for (var i = 0; i < this.filters.length; i++) {
                    if (this.filters[i].hasOwnProperty('ClusterOption')) {
                        this.filters[i].ClusterOption = false;
                    }
                }
                this.clusterFilterState.filterQuery = "";
                this.clusterService.reCluster();
            };
            return RocksFiltersService;
        }());
        filters.RocksFiltersService = RocksFiltersService;
        angular
            .module('explorer.rockproperties.clusterfilters', [])
            .controller("rocksClusterFilterCtrl", RocksClusterFilterCtrl)
            .directive("rocksClusterFilters", function () {
            return {
                templateUrl: 'rockprops/cluster-filters.html',
                controller: RocksClusterFilterCtrl,
                controllerAs: 'rocksClusterFilterVM'
            };
        })
            .factory("rocksFiltersService", [
            "$http",
            "$rootScope",
            "rocksConfigService",
            "clusterService",
            "clusterFilterState",
            function ($http, $rootScope, rocksConfigService, clusterService, clusterFilterState) {
                return new rpComponents.filters.RocksFiltersService($http, $rootScope, rocksConfigService, clusterService, clusterFilterState);
            }])
            .factory("clusterFilterState", [function () { return new rpComponents.filters.ClusterFilterState(); }]);
    })(filters = rpComponents.filters || (rpComponents.filters = {}));
})(rpComponents || (rpComponents = {}));
/// <reference path="../../typings/tsd.d.ts" />
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
                    '&y=' + Cesium.Math.toDegrees(this.targetPos.latitude);
                this.clusterFilterState.filterQuery;
                var query = this.serviceUrl + 'query' + args;
                console.log("query");
                console.log(query);
                this.$http({
                    method: 'GET',
                    // mock
                    //url: this.serviceUrl + '/geojson-cluster.json'
                    //url: this.serviceUrl + '/cluster.json'
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
                    //'&maxCount='+this.maxListStep +
                    '&startIndex=' + this.listIndex +
                    '&x=' + Cesium.Math.toDegrees(this.targetPos.longitude) +
                    '&y=' + Cesium.Math.toDegrees(this.targetPos.latitude);
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
/// <reference path="../../typings/tsd.d.ts" />
var rpComponents;
(function (rpComponents) {
    var clusterService;
    (function (clusterService) {
        'use strict';
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
                            var maxCorrection = Math.pow(1.43, _this.zoomLevelService.nextIndex);
                            console.log("Mac correction" + maxCorrection);
                            _this.clusterRangeMeta.maxCount = d3.max(clusters, function (d) { return d.properties.count; });
                            _this.clusterRangeMeta.scale = d3.scale.linear()
                                .domain([0, _this.clusterRangeMeta.maxCount])
                                .range([0, _this.clusterRangeMeta.maxExtrudeHeight / maxCorrection]);
                            for (var i = 0; i < clusters.length; i++) {
                                // tag id with type for pick handling
                                clusters[i].properties['featureType'] = 'rockPropsCluster';
                                var clusterProps = _this.computeClusterAttributes(clusters[i].properties.count);
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
                    position: Cesium.Cartesian3.fromDegrees(cluster.geometry.coordinates[0], cluster.geometry.coordinates[1], 10000 + clusterProps.extrudeHeight),
                    text: cluster.properties.count.toString(),
                    fillColor: Cesium.Color.BLACK,
                    outlineColor: Cesium.Color.RED,
                    // TODO review labelling
                    font: (45 - (this.zoomLevelService.nextIndex * 3)) + 'px arial, sans-serif',
                    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                    id: cluster
                };
            };
            ClusterService.prototype.computeClusterAttributes = function (count) {
                var radius = this.zoomLevelService.zoomLevels[this.zoomLevelService.zoomLevels.length - this.zoomLevelService.nextIndex] / 100;
                console.log("RADIUS " + radius);
                var attrs = {
                    // tweak these to scale cluster size/extrude on zoom
                    radius: radius,
                    extrudeHeight: this.clusterRangeMeta.scale(count) / (this.zoomLevelService.nextIndex / 3)
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
/// <reference path="../../typings/tsd.d.ts" />
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
                    _this.wmsLayerNames = _this.getLayerNamesFromWmsCapsJson(_this.xmlToJson($.parseXML(data)));
                    deferred.resolve(_this.wmsLayerNames);
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
        }());
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
                        var promises = [];
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
                ga('send', 'event', 'explorer-rock-properties', 'click', 'clipship data export: ' + format);
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
        }());
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
        }());
        spinnerService.LoadingSpinnerService = LoadingSpinnerService;
        angular
            .module('explorer.rockproperties.spinner', [])
            .factory("loadingSpinnerService", [function () { return new rpComponents.spinnerService.LoadingSpinnerService(); }]);
    })(spinnerService = rpComponents.spinnerService || (rpComponents.spinnerService = {}));
})(rpComponents || (rpComponents = {}));
/// <reference path="../../typings/tsd.d.ts" />
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
/// <reference path="../../typings/tsd.d.ts" />
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
                    this.wmsInspectorState.targetGeom.degrees.lon + ',' +
                    this.wmsInspectorState.targetGeom.degrees.lat + ',' +
                    (this.wmsInspectorState.targetGeom.degrees.lon + 0.0003) + ',' +
                    (this.wmsInspectorState.targetGeom.degrees.lat + 0.0003) +
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
            .module('explorer.rockproperties.inspector', ['explorer.assets'])
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
/// <reference path="../../typings/tsd.d.ts" />
var rpComponents;
(function (rpComponents) {
    var pointsService;
    (function (pointsService) {
        'use strict';
        var RocksWmsPointsCtrl = (function () {
            function RocksWmsPointsCtrl($scope, wmsPointsService, rocksPanelService, wmsInspectorState) {
                this.$scope = $scope;
                this.wmsPointsService = wmsPointsService;
                this.rocksPanelService = rocksPanelService;
                this.wmsInspectorState = wmsInspectorState;
            }
            RocksWmsPointsCtrl.$inject = ["$scope", "wmsPointsService", "rocksPanelService", "wmsInspectorState"];
            return RocksWmsPointsCtrl;
        }());
        pointsService.RocksWmsPointsCtrl = RocksWmsPointsCtrl;
        var WmsPointsService = (function () {
            function WmsPointsService($rootScope, gwsUtilService, rocksConfigService, wmsInspectorState) {
                var _this = this;
                this.$rootScope = $rootScope;
                this.gwsUtilService = gwsUtilService;
                this.rocksConfigService = rocksConfigService;
                this.wmsInspectorState = wmsInspectorState;
                this.inspectorEnabled = true;
                this.masterChecked = true;
                this.legendParamString = "";
                this.$inject = [
                    "$rootScope",
                    "gwsUtilService",
                    "rocksConfigService",
                    "wmsInspectorState"
                ];
                this.$rootScope.$on('rocks.config.ready', function () {
                    _this.init();
                });
            }
            WmsPointsService.prototype.init = function () {
                var _this = this;
                this.wmsServiceUrl = this.rocksConfigService.config.geoserverWmsUrl;
                this.viewer = this.rocksConfigService.viewer;
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
                ga('send', 'event', 'explorer-rock-properties', 'click', 'update wms points layer: ' + targetLayers.toString());
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
        }());
        pointsService.WmsPointsService = WmsPointsService;
        angular
            .module('explorer.rockproperties.wmspoints', [])
            .factory("wmsPointsService", ["$rootScope", "gwsUtilService", "rocksConfigService", "wmsInspectorState",
            function ($rootScope, gwsUtilService, rocksConfigService, wmsInspectorState) {
                return new rpComponents.pointsService.WmsPointsService($rootScope, gwsUtilService, rocksConfigService, wmsInspectorState);
            }])
            .controller("rocksWmsPointsCtrl", RocksWmsPointsCtrl)
            .directive("rocksWmsPointsLegend", function () {
            return {
                templateUrl: 'rockprops/wms-points-panel.html',
                controller: RocksWmsPointsCtrl,
                controllerAs: 'rocksWmsPointsVM'
            };
        });
    })(pointsService = rpComponents.pointsService || (rpComponents.pointsService = {}));
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
                    _this.nextIndex = _this.getIndex(Cesium.Ellipsoid.WGS84.cartesianToCartographic(_this.viewer.camera.position).height);
                    // changed indexes, trigger recluster
                    if (_this.previousIndex > -1 && _this.previousIndex != _this.nextIndex) {
                        _this.$rootScope.$broadcast('rocks.clusters.update', _this.nextIndex);
                    }
                    console.log("INDEX = " + _this.nextIndex + " HEIGHT = " + Cesium.Ellipsoid.WGS84.cartesianToCartographic(_this.viewer.camera.position).height);
                    _this.previousIndex = _this.nextIndex;
                };
                this.$rootScope.$on('rocks.config.ready', function () {
                    _this.viewer = _this.rocksConfigService.viewer;
                });
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
                        return this.zoomLevels.length - i;
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
angular.module("explorer.rockproperties.templates", []).run(["$templateCache", function ($templateCache) {
        $templateCache.put("rockprops/clip-ship.html", "\r\n<div ng-show=\"rocksClipShipVM.rocksClipShipService.step == \'startDraw\'\">\r\n	<h6 class=\"dis-inline\">\r\n		1.\r\n		<button ng-click=\"rocksClipShipVM.rocksClipShipService.startDraw()\" style=\"padding: 5px 10px;border-radius: 3px;border: none;\">\r\n			Click here\r\n		</button>\r\n		to select an area on the map <i class=\"fa fa-scissors\" style=\"font-size: 16px;\"></i></h6>\r\n</div>\r\n\r\n\r\n<div ng-show=\"rocksClipShipVM.rocksClipShipService.step == \'selectFeatures\'\">\r\n\r\n	<h6 class=\"dis-inline\">2. Select features to download:</h6>\r\n\r\n	<div>\r\n\r\n		<!-- if we have active property filters, use them instead -->\r\n		<p ng-show=\"hasAnyFilter\">\r\n			<i class=\"fa fa-info-circle\"></i> Current filters will be applied to the exported data.\r\n		</p>\r\n\r\n		<div ng-hide=\"hasAnyFilter\">\r\n\r\n			<div style=\"padding: 5px; margin-top: 10px; background: #f0f0f0; border-radius: 3px;\">\r\n				<label>\r\n					<input\r\n						type=\"checkbox\"\r\n						ng-model=\"masterCheck\"\r\n						ng-disabled=\"hasPropertyFilter\"\r\n						ng-change=\"rocksClipShipVM.rocksFiltersService.setAllExportSelected(masterCheck)\" />\r\n					{{ masterCheck ? \'Deselect\' : \'Select\' }} All\r\n				</label>\r\n			</div>\r\n\r\n			<label style=\"margin-left: 25px;\" class=\"checkbox\" ng-repeat=\"property in rocksClipShipVM.rocksFiltersService.exportProperties.filterOptions\">\r\n				<input\r\n					type=\"checkbox\"\r\n					value=\"property.isSelected\"\r\n					ng-model=\"property.isSelected\"\r\n					ng-checked=\"masterCheck\"\r\n					ng-disabled=\"hasPropertyFilter\">\r\n				{{ property.name }}\r\n			</label>\r\n\r\n		</div>\r\n\r\n		<div style=\"margin: 20px 0px 20px 0px;\">\r\n			<label title=\"Export Format\">Export Format</label>\r\n			<select ng-change=\"rocksClipShipVM.rocksClipShipService.updateExportFormat(exportFormats.SelectedOption)\"\r\n					ng-model=\"exportFormats.SelectedOption\"\r\n					name=\"format\"\r\n					ng-options=\"option for option in rocksClipShipVM.rocksClipShipService.exportFormats\"\r\n					ng-class=\"form-control\"\r\n					class=\"filter-input\"\r\n					style=\"float: right; width: 160px;\">\r\n				<option value=\"\" class=\"\">--select--</option>\r\n			</select>\r\n		</div>\r\n\r\n		<a ng-click=\"rocksClipShipVM.rocksClipShipService.openGeoserver()\" style=\"font-size: 11px; margin-top: 20px; color: blue; text-decoration: underline;\">\r\n			More Options via GeoServer Dashboard\r\n		</a>\r\n\r\n		<div style=\"margin-top: 20px;\">\r\n			<button\r\n				type=\"button\"\r\n				class=\"btn btn-default\"\r\n				ng-click=\"rocksClipShipVM.rocksClipShipService.step = \'startDraw\'; rocksClipShipVM.rocksClipShipService.isDrawing = false\"\r\n				title=\"Cancel Download\"\r\n				style=\"width: 40%; float: left;\">Cancel</button>\r\n			<button\r\n				type=\"button\"\r\n				class=\"btn btn-default focusMe\"\r\n				ng-click=\"rocksClipShipVM.startClipShip()\"\r\n				style=\"width: 40%; float: right\"\r\n				title=\"Select one or more reference feature classes before continuing.\"\r\n				ng-disabled=\"(rocksClipShipVM.rocksFiltersService.exportProperties.filterOptions | noClipSelected) || (!rocksClipShipVM.rocksClipShipService.targetFormat)\">Next</button>\r\n		</div>\r\n\r\n	</div>\r\n\r\n</div>\r\n\r\n<div ng-show=\"rocksClipShipVM.rocksClipShipService.step == \'download\'\">\r\n\r\n	<h6>3. Data Export:</h6>\r\n\r\n	<div ng-hide=\"rocksClipShipVM.rocksQueryBuilderExport.loading\">\r\n\r\n		<p ng-show=\"rocksClipShipVM.rocksClipShipService.targetFormat === \'application/json\'\" style=\"margin-top: 40px;\">\r\n			<i class=\"fa fa-info-circle\"></i> Once json has loaded, save page as a .json file.\r\n		</p>\r\n\r\n		<p class=\"warning-block\" style=\"margin-top: 20px;\">\r\n			<i class=\"fa fa-info-circle\"></i> Large data sets may take several minutes to export.\r\n		</p>\r\n\r\n		<a\r\n			class=\"btn btn-default\"\r\n			target=\"_blank\"\r\n			href=\"{{rocksClipShipVM.rocksQueryBuilderExport.exportUrl}}\"\r\n			ng-click=\"rocksClipShipVM.rocksClipShipService.step = \'startDraw\'; rocksClipShipVM.rocksClipShipService.isDrawing = false\"\r\n			style=\"width: 100%; margin-top: 30px;\"\r\n			role=\"button\">\r\n			<i class=\"fa fa-download\"></i> Download {{ rocksClipShipVM.rocksClipShipService.targetFormat }}\r\n		</a>\r\n\r\n		<a\r\n			class=\"btn btn-default\"\r\n			href=\"javascript:;\"\r\n			ng-click=\"rocksClipShipVM.rocksClipShipService.step = \'selectFeatures\'\"\r\n			style=\"width: 100%; margin-top: 10px;\"\r\n			role=\"button\">\r\n			<i class=\"fa fa-arrow-left\"></i> Back\r\n		</a>\r\n\r\n	</div>\r\n\r\n</div>\r\n\r\n<div id=\"rock-clip-ship-loading\" ng-show=\"rocksClipShipVM.rocksQueryBuilderExport.loading\">\r\n	<p>Preparing Data..</p>\r\n</div>");
        $templateCache.put("rockprops/cluster-filters.html", "\r\n<!-- TODO plug into rock props filter service -->\r\n\r\n<div ng-hide=\"clusterInspectorVM.rocksPanelService.clustersEnabled\">\r\n	Enable Cluster Features to apply filters.\r\n</div>\r\n\r\n<div ng-show=\"clusterInspectorVM.rocksPanelService.clustersEnabled\">\r\n\r\n\r\n	<div ng-repeat=\"filter in rocksClusterFilterVM.rocksFiltersService.filters\" style=\"padding-top:7px;position:relative; overflow-x: hidden;overflow-y: auto;\">\r\n\r\n		<label style=\"font-size: 11px;\" title=\"{{filter.filterLabel}}\">{{filter.filterLabel}}</label>\r\n		<select\r\n				ng-model=\"filter.ClusterOption\"\r\n				name=\"filter.filterType\"\r\n				ng-options=\"option as option for option in filter.filterOptions\"\r\n				ng-class=\'form-control\'\r\n				class=\'filter-input\'\r\n				style=\"float:left;width:100%;position:relative;\">\r\n			<option value=\"\" selected>--select--</option>\r\n		</select>\r\n\r\n	</div>\r\n\r\n	<div style=\"text-align: center;\">\r\n		<a class=\"btn btn-default\" style=\"margin: 10px;\" ng-click=\"rocksClusterFilterVM.rocksFiltersService.applyFilters()\" href=\"javascript:;\">\r\n			<i class=\"fa fa-filter fa-lg\"></i>\r\n			Apply\r\n		</a>\r\n\r\n		<a class=\"btn btn-default\" style=\"margin: 10px;\" ng-click=\"rocksClusterFilterVM.rocksFiltersService.clearFilters()\" href=\"javascript:;\">\r\n			<i class=\"fa fa-remove fa-lg\"></i>\r\n			Clear\r\n		</a>\r\n\r\n		<p ng-show=\"filterResultCount()\" style=\"text-align: left; margin: 10px; font-size: 14px;\">\r\n			<strong>Record Count: </strong>\r\n			14320\r\n		</p>\r\n	</div>\r\n\r\n</div>\r\n");
        $templateCache.put("rockprops/cluster-inspector.html", "\r\n<div ng-hide=\"clusterInspectorVM.rocksPanelService.clustersEnabled\">\r\n	Enable Cluster Features to use the inspector tool.\r\n</div>\r\n\r\n<div ng-show=\"clusterInspectorVM.rocksPanelService.clustersEnabled\">\r\n\r\n	<p>Click on a cluster to see:</p>\r\n\r\n	<label class=\"radio-inline\">\r\n		<input\r\n			type=\"radio\"\r\n			ng-model=\"clusterInspectorVM.clusterInspectorService.inspectMode\"\r\n			value=\"CHART\"> Summary charts\r\n	</label>\r\n	<label class=\"radio-inline\">\r\n		<input\r\n			type=\"radio\"\r\n			ng-model=\"clusterInspectorVM.clusterInspectorService.inspectMode\"\r\n			value=\"LIST\"> Results list\r\n	</label>\r\n\r\n	<div id=\"cluster-result-list-loading\" style=\"padding-top: 10px; text-align: center;\"></div>\r\n\r\n\r\n	<div ng-show=\"clusterInspectorVM.clusterInspectorService.listReady\">\r\n\r\n		<div ng-if=\"clusterInspectorVM.clusterInspectorService.listFeatures.totalFeatures > 0\" class=\"alert alert-success\" style=\"margin-top: 30px;\">\r\n			Features loaded:\r\n			{{\r\n				clusterInspectorVM.clusterInspectorService.listFeatures.totalFeatures +\r\n				clusterInspectorVM.clusterInspectorService.listIndex\r\n			}}\r\n		</div>\r\n\r\n		<div ng-if=\"!(clusterInspectorVM.clusterInspectorService.listFeatures.totalFeatures > 0)\" class=\"alert alert-warning\" style=\"margin-top: 30px;\">\r\n			No more features to load at this location.\r\n		</div>\r\n\r\n		<div ng-repeat=\"feature in clusterInspectorVM.clusterInspectorService.listFeatures.features\" class=\"rocks-result-list-feature\">\r\n\r\n			<table class=\"table table-hover table-striped\">\r\n\r\n				<h5>ID: {{feature.id}}</h5>\r\n				<tbody>\r\n					<tr>\r\n						<td><strong>GEOM</strong></td>\r\n						<td>{{feature.geometry.coordinates[0]}}, {{feature.geometry.coordinates[1]}}</td>\r\n					</tr>\r\n					<tr ng-repeat=\"(key, value) in feature.properties\">\r\n						<td><strong>{{key}}</strong></td>\r\n						<td>{{value}}</td>\r\n					</tr>\r\n				</tbody>\r\n\r\n			</table>\r\n		</div>\r\n\r\n		<a\r\n			ng-show=\"clusterInspectorVM.clusterInspectorService.listFeatures.totalFeatures <= clusterInspectorVM.clusterInspectorService.maxListStep\"\r\n			class=\"btn btn-default\"\r\n			style=\"margin-top: 40px; width: 100%;\"\r\n			ng-click=\"clusterInspectorVM.clusterInspectorService.loadNextListStep()\"\r\n			href=\"javascript:;\">\r\n			Load more records\r\n		</a>\r\n\r\n	</div>\r\n\r\n</div>\r\n");
        $templateCache.put("rockprops/cluster-summary.html", "<div id=\"clusterSummaryChart\" ng-show=\"chartState.targetChartId == \'clusterSummaryChart\'\">\r\n\r\n	<div class=\"btn-group\" style=\"position: absolute;right: 10px;top: 10px;\">\r\n		<button type=\"button\" class=\"btn btn-default\" title=\"Close charts\" ng-click=\"clusterChartVM.clusterChartService.hideChart(); clusterChartVM.clusterService.clearHighlighted();\">\r\n			<i class=\"fa fa-times-circle\" role=\"presentation\" style=\"font-size:16px; color:black\"></i>\r\n		</button>\r\n	</div>\r\n\r\n	<div id=\"cluster-summary-chart-d3\"></div>\r\n	<div id=\"cluster-summary-chart-loading\"></div>\r\n\r\n</div>");
        $templateCache.put("rockprops/control-panel.html", "<div>\r\n\r\n	<div class=\"rocks-accordion\">\r\n		<div class=\"rocks-toggle-button\" title=\"Show/hide cluster features\">\r\n			<input\r\n				type=\"checkbox\"\r\n				ng-model=\"controlPanelVM.rocksPanelService.clustersEnabled\"\r\n				ng-change=\"controlPanelVM.rocksPanelService.toggleClusters()\" />\r\n		</div>\r\n		<button class=\"title\" ng-click=\"controlPanelVM.setTargetPanel(\'clusterFeatures\')\">\r\n			<i class=\"fa fa-{{ controlPanelVM.targetPanel == \'clusterFeatures\' ? \'minus\' : \'plus\' }}\"></i>\r\n			Cluster Features\r\n		</button>\r\n	</div>\r\n	<div class=\"rocks-accordion-content\" ng-show=\"controlPanelVM.targetPanel == \'clusterFeatures\'\">\r\n\r\n		<uib-tabset active=\"activeJustified\" justified=\"true\">\r\n			<uib-tab index=\"0\" heading=\"Inspect\" style=\"padding: 0px 0px 20px 0px;\">\r\n				<rocks-cluster-inspector-panel></rocks-cluster-inspector-panel>\r\n			</uib-tab>\r\n			<uib-tab index=\"1\" heading=\"Filter\" style=\"padding: 0px 0px 20px 0px;\">\r\n				<rocks-cluster-filters></rocks-cluster-filters>\r\n			</uib-tab>\r\n		</uib-tabset>\r\n\r\n	</div>\r\n\r\n	<div class=\"rocks-accordion\">\r\n		<div class=\"rocks-toggle-button\" title=\"Show/hide point features WMS layer\">\r\n			<input\r\n				type=\"checkbox\"\r\n				ng-model=\"controlPanelVM.rocksPanelService.pointsEnabled\"\r\n				ng-change=\"controlPanelVM.rocksPanelService.togglePoints()\" />\r\n		</div>\r\n		<div class=\"title\" ng-click=\"controlPanelVM.setTargetPanel(\'pointFeatures\')\">\r\n			<i class=\"fa fa-{{ controlPanelVM.targetPanel == \'pointFeatures\' ? \'minus\' : \'plus\' }}\"></i>\r\n			Point Features (WMS)\r\n		</div>\r\n	</div>\r\n\r\n	<div class=\"rocks-accordion-content\" ng-show=\"controlPanelVM.targetPanel == \'pointFeatures\'\">\r\n		<rocks-wms-points-legend></rocks-wms-points-legend>\r\n	</div>\r\n\r\n\r\n	<div class=\"rocks-accordion\">\r\n		<div class=\"rocks-toggle-button\" title=\"Show/hide point features WMS layer\">\r\n			<input\r\n				type=\"checkbox\"\r\n				ng-model=\"controlPanelVM.wmsInspectorService.inspectorEnabled\"\r\n				ng-change=\"controlPanelVM.wmsInspectorService.togglePointInspector()\" />\r\n		</div>\r\n		<div class=\"title\" ng-click=\"controlPanelVM.setTargetPanel(\'wmsInspector\')\">\r\n			<i class=\"fa fa-{{ controlPanelVM.targetPanel == \'wmsInspector\' ? \'minus\' : \'plus\' }}\"></i>\r\n			WMS Inspector (GetFeatureInfo)\r\n		</div>\r\n	</div>\r\n	<div class=\"rocks-accordion-content\" ng-show=\"controlPanelVM.targetPanel == \'wmsInspector\'\">\r\n		<wms-inspector-panel></wms-inspector-panel>\r\n	</div>\r\n\r\n\r\n	<div class=\"rocks-accordion\">\r\n		<div class=\"title w100\" ng-click=\"controlPanelVM.setTargetPanel(\'clipShip\')\">\r\n			<i class=\"fa fa-{{ controlPanelVM.targetPanel == \'clipShip\' ? \'minus\' : \'plus\' }}\"></i>\r\n			Download Rock Property Data\r\n		</div>\r\n	</div>\r\n\r\n	<div class=\"rocks-accordion-content\" ng-show=\"controlPanelVM.targetPanel == \'clipShip\'\">\r\n\r\n		<rocks-clip-ship></rocks-clip-ship>\r\n\r\n	</div>\r\n\r\n</div>");
        $templateCache.put("rockprops/wms-inspector-panel.html", "\r\n<div ng-show=\"wmsInspectorVM.wmsInspectorState.view == \'INTRO\'\">\r\n	<div ng-if=\"wmsInspectorVM.wmsInspectorService.inspectorEnabled\">Click the map to get feature info.</div>\r\n	<div ng-if=\"!wmsInspectorVM.wmsInspectorService.inspectorEnabled\">Enable WMS Inspector to interrogate WMS layers.</div>\r\n</div>\r\n\r\n<div ng-show=\"wmsInspectorVM.wmsInspectorState.view == \'LAYERSELECT\'\">\r\n\r\n	<p style=\"margin: 10px 0px;\" tooltip=\"Approx 30m accuracy\">\r\n		Select a layer to query:\r\n		<code>\r\n			{{wmsInspectorVM.wmsInspectorState.targetGeom.degrees.lat | number : 2}},\r\n			{{wmsInspectorVM.wmsInspectorState.targetGeom.degrees.lon | number : 2}}\r\n		</code>\r\n	</p>\r\n\r\n	<a\r\n		class=\"btn btn-default\"\r\n		style=\"width: 100%; margin: 2px 0px\"\r\n		ng-click=\"wmsInspectorVM.wmsInspectorService.queryRocks()\"\r\n		href=\"javascript:;\">\r\n		Rock Properties Data\r\n	</a>\r\n\r\n	<a\r\n		ng-repeat=\"feature in wmsInspectorVM.wmsInspectorService.features\"\r\n		class=\"btn btn-default\"\r\n	   	style=\"width: 100%; margin: 2px 0px\"\r\n	   	ng-click=\"wmsInspectorVM.wmsInspectorService.queryFeature(feature)\"\r\n	   	href=\"javascript:;\">\r\n		{{feature.name}}\r\n	</a>\r\n\r\n	<a class=\"btn btn-default\"\r\n	   style=\"width: 100%; margin-top: 20px\"\r\n	   ng-click=\"wmsInspectorVM.wmsInspectorState.view = \'INTRO\'\"\r\n	   href=\"javascript:;\">\r\n		<i class=\"fa fa-times fa-lg\"></i>\r\n		Cancel\r\n	</a>\r\n\r\n</div>\r\n\r\n\r\n<div ng-show=\"wmsInspectorVM.wmsInspectorState.view == \'FEATUREINFO\'\">\r\n\r\n	<div ng-show=\"wmsInspectorVM.wmsInspectorService.isLoading\">\r\n		<div id=\"rocks-inspector-loading\"></div>\r\n	</div>\r\n\r\n	<div ng-hide=\"wmsInspectorVM.wmsInspectorService.isLoading\">\r\n\r\n		<p style=\"margin: 10px 0px;\" tooltip=\"Approx 30m accuracy\">\r\n			Feature Info for:\r\n			<code>\r\n				{{wmsInspectorVM.wmsInspectorState.targetGeom.degrees.lat | number : 2}},\r\n				{{wmsInspectorVM.wmsInspectorState.targetGeom.degrees.lon | number : 2}}\r\n			</code>\r\n		</p>\r\n\r\n		<!-- put html here.. -->\r\n		<div ng-bind-html=\"wmsInspectorVM.wmsInspectorService.featureInfo\"></div>\r\n\r\n	</div>\r\n\r\n	<div>\r\n\r\n		<a class=\"btn btn-default\"\r\n		   style=\"width: 49%; margin-top: 20px\"\r\n		   ng-click=\"wmsInspectorVM.wmsInspectorState.view = \'LAYERSELECT\'\"\r\n		   href=\"javascript:;\">\r\n			<i class=\"fa fa-arrow-left fa-lg\"></i>\r\n			Back\r\n		</a>\r\n\r\n		<a class=\"btn btn-default\"\r\n		   style=\"width: 49%; margin-top: 20px\"\r\n		   ng-click=\"wmsInspectorVM.wmsInspectorState.view = \'INTRO\'\"\r\n		   href=\"javascript:;\">\r\n			<i class=\"fa fa-times fa-lg\"></i>\r\n			Cancel\r\n		</a>\r\n\r\n	</div>\r\n\r\n</div>");
        $templateCache.put("rockprops/wms-points-panel.html", "<div ng-hide=\"rocksWmsPointsVM.rocksPanelService.pointsEnabled\">\r\n	Enable Point Features to view layers.\r\n</div>\r\n\r\n<div ng-show=\"rocksWmsPointsVM.rocksPanelService.pointsEnabled\">\r\n\r\n	<div style=\"padding: 5px 10px; margin-left: -10px; background: #f0f0f0; border-radius: 3px;\">\r\n		<label>\r\n			<input\r\n				type=\"checkbox\"\r\n				ng-model=\"rocksWmsPointsVM.wmsPointsService.masterChecked\"\r\n				ng-change=\"rocksWmsPointsVM.wmsPointsService.toggleChecked()\"\r\n				ng-disabled=\"!rocksWmsPointsVM.rocksPanelService.pointsEnabled\"/>\r\n			{{ rocksWmsPointsVM.wmsPointsService.masterChecked ? \'Deselect\' : \'Select\' }} all layers\r\n		</label>\r\n	</div>\r\n\r\n	<div ng-repeat=\"legend in rocksWmsPointsVM.wmsPointsService.legendData\" class=\'rocks-points-legend-item\'>\r\n\r\n		<label>\r\n			<input\r\n			type=\"checkbox\"\r\n			ng-model=\"legend.isSelected\" />\r\n			<img ng-src=\"{{legend.legendUrl}}\" alt=\"{{legend}} legend icon\" />\r\n		</label>\r\n\r\n	</div>\r\n\r\n	<a class=\"btn btn-default\"\r\n	   style=\"width: 100%; margin-top: 20px\"\r\n	   ng-click=\"rocksWmsPointsVM.wmsPointsService.updatePointsLayer()\"\r\n	   href=\"javascript:;\">\r\n		<i class=\"fa fa-refresh fa-lg\"></i>\r\n		Update layers\r\n	</a>\r\n\r\n</div>");
    }]);
