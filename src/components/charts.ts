/// <reference path="../../typings/tsd.d.ts" />

declare var d3: any;

module rpComponents.chartService {

    'use strict';

    export interface IClusterChartCtrl {}
    export class ClusterChartCtrl implements IClusterChartCtrl {

        static $inject = ["$scope", "clusterChartService", "clusterService"];
        constructor(
            public $scope: ng.IScope,
            public clusterChartService: rpComponents.chartService.IClusterChartService,
            public clusterService: rpComponents.clusterService.IClusterService
        ){}
    }

    export interface IClusterChartService {
        buildChart(data: any): any;
        hideChart(): void;
    }

    export class ClusterChartService implements IClusterChartService {

        static $inject = [
            "$http",
            "$rootScope"
        ];

        constructor(
            public $http: ng.IHttpService,
            public $rootScope: ng.IRootScopeService
        ) {}


        public hideChart():void {
            this.$rootScope.$broadcast("chart.update", {
                targetChartId: false
            });
        }

        public buildChart(dataset: any): any {

            document.getElementById("cluster-summary-chart-d3").innerHTML = "";

            // trigger open/display a chart div
            this.$rootScope.$broadcast("chart.update", {
                targetChartId: "clusterSummaryChart"
            });

            // push data into array for d3 charting
            var properties: any = [];
            angular.forEach(dataset.properties, (property: any, key: any) => {
                var propertyData: any = [];
                angular.forEach(property, (attribute: any, attKey: any) => {
                    propertyData.push({ attributeName: attKey, count: attribute });
                });
                properties.push({ propertyName: key, data: propertyData });
            });

            /*---------------------------------------- D3 -----------------------------------------*/

            // LAYOUT
            var minWidth: number = 1250;
            var minHeight: number = 255;
            var numberOfCharts = (properties.length < 7) ? properties.length : 4; // use two rows if we get too many properties
            var width: any;
            var height: any;
            var padding: any;
            var donutWidth: number;

            if(document.body.clientHeight * 0.35 > minHeight && document.body.clientWidth > minWidth){
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

            var panelWidth: number = document.body.clientWidth - (2 * padding.left + padding.right);
            var radius: any = Math.min(width, height) / 2;

            // DATA
            // build a chart for each property
            properties.forEach((property: any) => {

                var color: any = d3.scale.category20();

                var svg: any = d3.select('#cluster-summary-chart-d3')
                    .append('svg')
                    .attr('width', width)
                    .attr('height', height)
                    .style('margin-left', padding.left+'px')
                    .style('margin-right', padding.right+'px')
                    .append('g')
                    .attr('transform', 'translate(' + (width / 2) +
                    ',' + ((height / 2)+ 10) + ')');

                var arc: any = d3.svg.arc()
                    .innerRadius(radius - donutWidth)
                    .outerRadius(radius);

                var pie: any = d3.layout.pie()
                    .value(function(d: any) { return d.count; })
                    .sort(null);

                var tooltip: any = d3.select('#cluster-summary-chart-d3')
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
                    .attr('fill', function(d: any, i: any) {
                        return color(d.data.attributeName);
                    })
                    .each(function(d: any) { this._current = d; });

                path.on('mouseover', function(d: any) {

                    var total = d3.sum(property.data.map(function(d: any) {
                        return d.count;
                    }));

                    var percent: any = Math.round(1000 * d.data.count / total) / 10;
                    tooltip.select('.attribute').html(d.data.attributeName);
                    tooltip.select('.count').html("Count: "+d.data.count);
                    tooltip.select('.percent').html("Percent: "+percent + '%');
                    tooltip.style('display', 'block');
                });

                path.on('mouseout', function() {
                    tooltip.style('display', 'none');
                });

                path.on('mousemove', function(d: any) {

                    var x: number = (d3.event.pageX > panelWidth - 180) ? d3.event.pageX - 180 : d3.event.pageX;
                    var y: number = (d3.event.pageY > document.body.clientHeight - 120) ? d3.event.pageY - 100 : d3.event.pageY + 10;

                    tooltip
                        .style('top', y + 'px')
                        .style('left', x + 'px');
                });

                // title
                svg.append("g")
                    .attr("class", "cluster-summary-chart-title")
                    .append("text")
                    .attr("x", 0)
                    .attr("y",  -((height / 2) + 7) )
                    .attr("dy", ".71em")
                    .style("text-anchor", "middle")
                    .style("fill", "#000")
                    .style("font-weight", "bold")
                    .text(property.propertyName);


                // PAGINATED LEGEND
                var legendCount: number = property.data.length;
                var legendWidth: number = 15;
                var legendSpacing: number = 6;

                var netLegendHeight: number = (legendWidth + legendSpacing) * legendCount;
                var legendPerPage: number;
                var totalPages: number;
                var pageNo: number;

                if((netLegendHeight / radius) > 1){

                    legendPerPage = Math.floor( radius / (legendWidth + legendSpacing));
                    totalPages = Math.ceil(legendCount / legendPerPage);
                    pageNo = 1;

                    var startIndex: number = (pageNo - 1) * legendPerPage;
                    var endIndex: number = startIndex + legendPerPage;
                    var dataSubset: any = [];

                    for(var i = 0; i < property.data.length; i++){
                        if( i >= startIndex && i < endIndex){
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
                function drawLegend(data: any, legendPerPage: number, pageNo: number, totalPages: number){

                    var legend = svg.selectAll("g.legendg")
                        .data(data)
                        .enter().append("g")
                        .attr('class','legendg')
                        .attr("transform", function (d: any, i: any) { return "translate(" + -(width / 2.3) + ","+ ((i * (legendWidth + legendSpacing)) - (height / 4)) +")"; });

                    var legendRect: any = legend.append("rect")
                        .attr("x", 45)
                        .attr("width", legendWidth)
                        .attr("height", legendWidth)
                        .attr("class", "legend")
                        .style('fill',function(d: any,i: any){return color(d.attributeName);});

                    var legendText: any = legend.append("text")
                        .attr("x", 65)
                        .attr("y", 6)
                        .attr("dy", ".35em")
                        .style("text-anchor", "start")
                        .text(function (d: any) {
                            // truncate long labels
                            var charSpace: number = (radius - 20) / 5;
                            if(d.attributeName.length > charSpace)
                                return d.attributeName.substring(0,charSpace)+'...';
                            else
                                return d.attributeName;
                        });

                    // title tooltips
                    legendRect.append("svg:title").text(function (d: any) {
                        var total: number = d3.sum(property.data.map(function(d: any) { return d.count;}));
                        return d.attributeName + " (" + Math.round(1000 * d.count / total) / 10 + "%)";
                    });
                    legendText.append("svg:title").text(function (d: any) {
                        var total: number = d3.sum(property.data.map(function(d: any) { return d.count;}));
                        return d.attributeName + " (" + Math.round(1000 * d.count / total) / 10 + "%)";
                    });

                    if(totalPages > 1){

                        var pageText: any = svg.append("g")
                            .attr('class','pageNo')
                            .attr("transform", "translate(" + (-10) + ","+ ((legendPerPage + 1) * (legendWidth+legendSpacing) - (height / 4)) +")");

                        pageText.append('text').text(pageNo+'/'+totalPages)
                            .attr('dx','.25em');

                        var prevtriangle: any = svg.append("g")
                            .attr('class','prev')
                            .attr("transform", "translate(" + (-20) + ","+ ((legendPerPage + 1.5) * (legendWidth+legendSpacing) - (height / 4)) +")")
                            .on('click',prevLegend)
                            .style('cursor','pointer');

                        var nexttriangle: any = svg.append("g")
                            .attr('class','next')
                            .attr("transform", "translate(" + (0) + ","+ ((legendPerPage + 1.5) * (legendWidth+legendSpacing) - (height / 4)) +")")
                            .on('click',nextLegend)
                            .style('cursor','pointer');

                        nexttriangle.append('polygon')
                            .style('stroke','#000')
                            .style('fill','#000')
                            .attr('points','0,0, 20,0, 10,10');

                        prevtriangle.append('polygon')
                            .style('stroke','#000')
                            .style('fill','#000')
                            .attr('points','0,10, 20,10, 10,0');

                        if(pageNo == totalPages){
                            nexttriangle.style('opacity','0.3');
                            nexttriangle.on('click','')
                                .style('cursor','');
                        }
                        else if(pageNo == 1){
                            prevtriangle.style('opacity','0.3');
                            prevtriangle.on('click','')
                                .style('cursor','');
                        }
                    }

                }

                function prevLegend(){
                    pageNo--;

                    svg.selectAll("g.legendg").remove();
                    svg.select('.pageNo').remove();
                    svg.select('.prev').remove();
                    svg.select('.next').remove();

                    var startIndex = (pageNo - 1) * legendPerPage;
                    var endIndex = startIndex + legendPerPage;
                    var dataSubset: any = []

                    for(var i = 0; i < property.data.length;i++){
                        if(i >= startIndex && i < endIndex){
                            dataSubset.push(property.data[i]);
                        }
                    }

                    drawLegend(dataSubset, legendPerPage, pageNo, totalPages);
                }

                function nextLegend(){

                    pageNo++;

                    svg.selectAll("g.legendg").remove();
                    svg.select('.pageNo').remove();
                    svg.select('.prev').remove();
                    svg.select('.next').remove();

                    var startIndex = (pageNo - 1) * legendPerPage;
                    var endIndex = startIndex + legendPerPage;
                    var seriesSubset: any = [];

                    for(var i = 0; i < property.data.length; i++){
                        if(i >= startIndex && i < endIndex){
                            seriesSubset.push(property.data[i]);
                        }
                    }
                    drawLegend(seriesSubset,legendPerPage,pageNo,totalPages);
                }

            });

            /*---------------------------------------- /D3 -----------------------------------------*/

            // DEBUG emulate loading..
            document.getElementById("cluster-summary-chart-d3").style.display = 'none';
            // chart ready to go
            setTimeout(function(){
                document.getElementById("cluster-summary-chart-loading").style.display = 'none';
                document.getElementById("cluster-summary-chart-d3").style.display = 'block';
            }, 1500);

            return;
        }
    }

    angular
        .module('explorer.rockproperties.charts', [])
        .factory("clusterChartService", ["$http", "$rootScope",
            ($http: ng.IHttpService, $rootScope: ng.IRootScopeService) =>
                new rpComponents.chartService.ClusterChartService($http, $rootScope)])

        .controller("clusterChartCtrl", ClusterChartCtrl)
        .directive("clusterChartSummary", function(): ng.IDirective {
            return {
                templateUrl: 'rockprops/cluster-summary.html',
                controller:  ClusterChartCtrl,
                controllerAs: 'clusterChartVM'
            };
        });

}
