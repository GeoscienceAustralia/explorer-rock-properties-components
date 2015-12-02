/// <reference path="../../typings/tsd.d.ts" />

module rpComponents.config {

    'use strict';

    export interface IRocksConfigService {
        config: any;
        setConfig(config: any): void;
    }

    export class RocksConfigService implements IRocksConfigService {
        config: any;

        static $inject = [
            "$rootScope"
        ];
        constructor(
            public $rootScope: ng.IRootScopeService
        ){}

        setConfig(config: any): void {
            this.config = config;
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
