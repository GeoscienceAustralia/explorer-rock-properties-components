/// <reference path="../../typings/tsd.d.ts" />

declare var d3: any;

module rpComponents.chartService {

    'use strict';

    // CONTROLLER
    export interface IClusterChartCtrl {}
    export class ClusterChartCtrl implements IClusterChartCtrl {

        static $inject = ["$scope", "clusterChartService"];
        constructor(
            public $scope: ng.IScope,
            public clusterChartService: rpComponents.chartService.IClusterChartService
        ){
            this.clusterChartService = clusterChartService;
        }

    }

    // FACTORY
    export interface IClusterChartService {
        buildChart(data: any): any;
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


        /**
         *
         * @param cluster
         *
         */
        public buildChart(data: any): any {
            //console.log("TODO query service for cluster info for:");
            //console.log(data);




            /*---------------------------------------- D3 -----------------------------------------*/
            // eg http://plnkr.co/edit/x1xD82?p=preview
            //'resources/mock-service/explorer-cossap-services/service/rock-properties/clusters/',




            var minWidth: number = 1100;
            var minHeight: number = 235;
            var numberOfCharts = 5;
            var width: any;
            var height: any;
            var donutWidth: number;
            var fontSize: number;

            if(document.body.clientHeight * 0.35 > minHeight && document.body.clientWidth > minWidth){
                width = document.body.clientWidth / numberOfCharts;
                height = document.body.clientHeight * 0.35;
                donutWidth = 25;
                fontSize = 14;
            }
            else {
                width = minWidth / numberOfCharts;
                height = minHeight;
                donutWidth = 15;
                fontSize: 10;
            }

            var radius: any = Math.min(width, height) / 2;
            var legendRectSize: any = 18;
            var legendSpacing: any = 4;
            var color: any = d3.scale.category20b();

            var svg: any = d3.select('#cluster-summary-chart-d3')
                .append('svg')
                .attr('width', width)
                .attr('height', height)
                .append('g')
                .attr('transform', 'translate(' + (width / 2) +
                ',' + (height / 2) + ')');

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

            //d3.json('resources/mock-service/explorer-cossap-services/service/rock-properties/clusters/weekdays.json', function(error: any, dataset: any) {
            //    dataset.forEach(function(d: any) {
            //        d.count = +d.count;
            //        d.enabled = true;
            //    });

            d3.json('resources/mock-service/explorer-cossap-services/service/rock-properties/clusters/cluster.json', function(error: any, dataset: any) {

                //dataset = dataset[0].data;
                //
                //dataset.forEach(function(property: any) {
                //
                //    //property.data.forEach(function(attribute: any){
                //
                //        property.count = +property.count;
                //        property.enabled = true;
                //
                //    //});
                //});

                dataset.forEach(function(property: any) {

                    //property.data.forEach(function(attribute: any){

                    property.count = +property.count;
                    property.enabled = true;

                    //});
                });


                console.log("dataset");
                console.log(dataset);

                var path = svg.selectAll('path')
                    .data(pie(dataset))
                    .enter()
                    .append('path')
                    .attr('d', arc)
                    .attr('fill', function(d: any, i: any) {
                        return color(d.data.attributeName);
                    })
                    .each(function(d: any) { this._current = d; });                

                path.on('mouseover', function(d: any) {

                    var total = d3.sum(dataset.map(function(d: any) {
                        return (d.enabled) ? d.count : 0;
                    }));

                    var percent: any = Math.round(1000 * d.data.count / total) / 10;
                    tooltip.select('.attribute').html(d.data.attributeName);
                    tooltip.select('.count').html(d.data.count);
                    tooltip.select('.percent').html(percent + '%');
                    tooltip.style('display', 'block');
                });

                path.on('mouseout', function() {
                    tooltip.style('display', 'none');
                });

                var legend: any = svg.selectAll('.cluster-summary-legend')
                    .data(color.domain())
                    .enter()
                    .append('g')
                    .attr('class', 'cluster-summary-legend')
                    .style('font-size', fontSize+'px')
                    .attr('transform', function(d: any, i: any) {
                        var height = legendRectSize + legendSpacing;
                        var offset =  height * color.domain().length / 2;
                        var horz = -2 * legendRectSize;
                        var vert = i * height - offset;
                        return 'translate(' + horz + ',' + vert + ')';
                    });

                legend.append('rect')
                    .attr('width', legendRectSize)
                    .attr('height', legendRectSize)
                    .style('fill', color)
                    .style('stroke', color)
                    .on('click', function(attributeName: any) {
                        var rect: any = d3.select(this);                             
                        var enabled: any = true;                                     
                        var totalEnabled: any = d3.sum(dataset.map(function(d: any) {     
                            return (d.enabled) ? 1 : 0;                           
                        }));                                                    

                        if (rect.attr('class') === 'disabled') {                
                            rect.attr('class', '');                               
                        } else {                                                
                            if (totalEnabled < 2) return;                         
                            rect.attr('class', 'disabled');                       
                            enabled = false;                                      
                        }                                                       

                        pie.value(function(d: any) {                                 
                            if (d.attributeName === attributeName) d.enabled = enabled;
                            return (d.enabled) ? d.count : 0;                     
                        });                                                     

                        path = path.data(pie(dataset));                         

                        path.transition()                                       
                            .duration(750)                                        
                            .attrTween('d', function(d: any) {                         
                                var interpolate = d3.interpolate(this._current, d); 
                                this._current = interpolate(0);                     
                                return function(t: any) {                                
                                    return arc(interpolate(t));                       
                                };                                                  
                            });                                                   
                    });                                                       

                legend.append('text')
                    .attr('x', legendRectSize + legendSpacing)
                    .attr('y', legendRectSize - legendSpacing)
                    .text(function(d: any) { return d; });

            });




            /*---------------------------------------- /D3 -----------------------------------------*/












            this.$rootScope.$broadcast("chart.ready", {
                targetChartId: "clusterSummaryChart"
            });

            return;
        }
    }

    // ng register
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
