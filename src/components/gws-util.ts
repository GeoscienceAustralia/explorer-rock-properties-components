/// <reference path="../../typings/browser.d.ts" />

/**
 *
 * Geoserver Utils, e.g. get list of layers names from web map service.
 *
 */
module rpComponents.gwsUtilService {

    'use strict';

    export interface IGwsUtilService {
        wmsLayerNames: string[];
        getWmsLayerNames(): ng.IPromise<Object>;
        getWfsFeatureTypeNames(): ng.IPromise<Object>;

        xmlToJson(xml: any): any;
    }

    export class GwsUtilService implements IGwsUtilService {

        public wmsLayerNames: string[];

        static $inject = [
            "$q",
            "$http",
            "rocksConfigService"
        ];

        constructor(
            public $q: ng.IQService,
            public $http: ng.IHttpService,
            public rocksConfigService: rpComponents.config.IRocksConfigService
        ) {}

        public getWfsFeatureTypeNames(): ng.IPromise<Object> {

            var deferred: any = this.$q.defer();

            this.$http.get(
                this.rocksConfigService.config.geoserverWfsUrl
                +'?request=GetCapabilities&service=wfs&version='
                + this.rocksConfigService.config.geoserverWfsVersion
            ).
                success((data: any, status: any, headers: any, config: any) => {
                    var layerNames: any = this.getFeatureTypeNamesFromWfsCapsJson(this.xmlToJson($.parseXML(data)));
                    deferred.resolve(layerNames);
                }).

                error(function(err){
                    console.log("GetCapabilities request failed");
                    console.log(err);
                    deferred.error();
                });

            return deferred.promise;
        }

        public getFeatureTypeNamesFromWfsCapsJson(data: any): any {

            var layerData: any = data["wfs:WFS_Capabilities"].FeatureTypeList.FeatureType;
            var layers: any = [];

            for(var i = 0; i < layerData.length; i++){
                layers.push(layerData[i].Name["#text"]);
            }
            return layers;
        }

        public getWmsLayerNames(): ng.IPromise<Object> {

            var deferred: any = this.$q.defer();

            this.$http.get(
                this.rocksConfigService.config.geoserverWmsUrl
                +'?request=GetCapabilities&service=wms&version='
                + this.rocksConfigService.config.geoserverWmsVersion
            ).
                success((data: any, status: any, headers: any, config: any) => {
                    this.wmsLayerNames = this.getLayerNamesFromWmsCapsJson(this.xmlToJson($.parseXML(data)));
                    deferred.resolve(this.wmsLayerNames);
                }).

                error(function(err){
                    console.log("GetCapabilities request failed");
                    console.log(err);
                    deferred.error();
                });

            return deferred.promise;
        }


        public getLayerNamesFromWmsCapsJson(data: any): any {

            var layerData: any = data.WMS_Capabilities.Capability.Layer.Layer;
            var layers: any = [];

            for(var i = 0; i < layerData.length; i++){
                layers.push(layerData[i].Name["#text"]);
            }
            return layers;
        }

        public xmlToJson(xml: any): any {

            var obj = {};

            if (xml.nodeType == 1) { // element
                // do attributes
                if (xml.attributes.length > 0) {
                    obj["@attributes"] = {};
                    for (var j = 0; j < xml.attributes.length; j++) {
                        var attribute = xml.attributes.item(j);
                        obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
                    }
                }
            } else if (xml.nodeType == 3) { // text
                obj = xml.nodeValue;
            }

            // do children
            if (xml.hasChildNodes()) {
                for(var i = 0; i < xml.childNodes.length; i++) {
                    var item = xml.childNodes.item(i);
                    var nodeName = item.nodeName;
                    if (typeof(obj[nodeName]) == "undefined") {
                        obj[nodeName] = this.xmlToJson(item);
                    } else {
                        if (typeof(obj[nodeName].push) == "undefined") {
                            var old = obj[nodeName];
                            obj[nodeName] = [];
                            obj[nodeName].push(old);
                        }
                        obj[nodeName].push(this.xmlToJson(item));
                    }
                }
            }
            return obj;
        }
    }

    angular
        .module('explorer.rockproperties.gwsutil', [])
        .factory("gwsUtilService", ["$q", "$http", "rocksConfigService",
            ($q: ng.IQService, $http: ng.IHttpService, rocksConfigService: rpComponents.config.IRocksConfigService) =>
            new rpComponents.gwsUtilService.GwsUtilService($q, $http, rocksConfigService)]);
}
