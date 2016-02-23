/// <reference path="../../typings/tsd.d.ts" />

module rpComponents.config {

    'use strict';

    export interface IRocksConfigService {
        config: any;
        viewer: any;
        setConfig(config: any, viewer: any): void;
    }

    export class RocksConfigService implements IRocksConfigService {

        public config: any;
        public viewer: any;

        static $inject = [
            "$rootScope"
        ];
        constructor(
            public $rootScope: ng.IRootScopeService
        ){}

        setConfig(config: any, viewer: any): void {
            this.config = config;
            this.viewer = viewer;
            this.$rootScope.$broadcast("rocks.config.ready");
        }
    }

    angular
        .module('explorer.rockproperties.config', [])
        .factory("rocksConfigService", ["$rootScope",
            (
                $rootScope: ng.IRootScopeService
            ) =>
                new rpComponents.config.RocksConfigService($rootScope)]);
}
