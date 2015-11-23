/// <reference path="../../typings/tsd.d.ts" />

declare var d3: any;

/**
 * Simple loading spinner so we're not tied to any img/icon font's
 */
module rpComponents.spinnerService {

    'use strict';

    export interface IChartSpinnerService {
        addSpinner(config: any): any;
    }

    export class ChartSpinnerService implements IChartSpinnerService {

        addSpinner(config: any): any {

            return function() {
                var radius: number = Math.min(config.width, config.height) / 2;
                var tau: number = 2 * Math.PI;

                var arc: any = d3.svg.arc()
                    .innerRadius(radius * 0.5)
                    .outerRadius(radius * 0.9)
                    .startAngle(0);

                var svg: any = d3.select(config.container).append("svg")
                    .attr("id", config.id)
                    .attr("width", config.width)
                    .attr("height", config.height)
                    .append("g")
                    .attr("transform", "translate(" + config.width / 2 + "," + config.height / 2 + ")");

                svg.append("path")
                    .datum({endAngle: 0.33*tau})
                    .style("fill", "#4D4D4D")
                    .attr("d", arc)
                    .call(spin, 1500)

                function spin(selection: any, duration: number) {
                    selection.transition()
                        .ease("linear")
                        .duration(duration)
                        .attrTween("transform", function() {
                            return d3.interpolateString("rotate(0)", "rotate(360)");
                        });

                    setTimeout(function() { spin(selection, duration); }, duration);
                }
             };
        }
    }

    // ng register
    angular
        .module('explorer.rockproperties.spinner', [])
        .factory("chartSpinnerService", [() => new rpComponents.spinnerService.ChartSpinnerService()]);
}
