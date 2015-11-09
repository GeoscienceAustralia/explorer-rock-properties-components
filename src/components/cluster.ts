/// <reference path="../../typings/tsd.d.ts" />

/**
 *
 *   Initial shell for single cluster
 *
 */
module rpComponents.cluster {

    'use strict';

    /**
     *
     * Each of the properties contains an aggregated data summary, e.g.
     *
     * property: {
     *  "magnetic susceptibility": 79.8,
     *  "total porosity": 18.2,
     *  "grain mass density": 2
     * }
     *
     *
     *
     */
    export interface ICluster {
        count: number,
        lat: number,
        lon: number,
        elev: number,
        lithologyGroup: {},
        property: {},
        provinceName: {},
        sampleType: {},
        stratigraphicUnitName: {},
    }

    export class Cluster implements ICluster{

        static $inject = [
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

        constructor(
            public count: number,
            public lat: number,
            public lon: number,
            public elev: number,
            public lithologyGroup: {},
            public property: {},
            public provinceName: {},
            public sampleType: {},
            public stratigraphicUnitName: {}
        ) {}
    }

}