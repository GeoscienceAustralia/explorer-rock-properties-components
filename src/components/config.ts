/// <reference path="../../typings/browser.d.ts" />

module rpComponents.config {

    'use strict';

    export interface IRocksConfigService {
        config: any;
        map: any;
        setConfig(config: any, viewer: any): void;
    }

    export class RocksConfigService implements IRocksConfigService {

        public config: any;
        public map: any;

        static $inject = [
            "$rootScope"
        ];
        constructor(
            public $rootScope: ng.IRootScopeService
        ){}

        setConfig(config: any, map: any): void {
            this.config = config;
            this.map = map;
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
