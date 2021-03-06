"use strict";
require("requirish")._(module);

var async = require("async");
var path = require("path");
var should = require("should");
var _ = require("underscore");

var address_space = require("lib/address_space/address_space");

var UAVariable = require("lib/address_space/ua_variable").UAVariable;
var StatusCodes = require("lib/datamodel/opcua_status_code").StatusCodes;
var DataType = require("lib/datamodel/variant").DataType;
var Variant = require("lib/datamodel/variant").Variant;
var DataValue = require("lib/datamodel/datavalue").DataValue;
var VariantArrayType = require("lib/datamodel/variant").VariantArrayType;
var AttributeIds = require("lib/services/read_service").AttributeIds;
var NodeClass = require("lib/datamodel/nodeclass").NodeClass;

var get_mini_address_space = require("test/fixtures/fixture_mininodeset_address_space").get_mini_address_space;

var browse_service = require("lib/services/browse_service");
var BrowseDirection = browse_service.BrowseDirection;

var sinon = require("sinon");

describe("Testing UAObject", function () {

    var addressSpace, rootFolder;
    var organizesReferenceType;
    var hasTypeDefinitionReferenceType;
    var baseObjectType;

    before(function (done) {
        get_mini_address_space(function (err, data) {
            addressSpace = data;
            rootFolder = addressSpace.findObject("RootFolder");
            organizesReferenceType = addressSpace.findReferenceType("Organizes");
            hasTypeDefinitionReferenceType = addressSpace.findReferenceType("HasTypeDefinition");
            baseObjectType = addressSpace.findObjectType("BaseObjectType");
            done(err);
        });
    });

    function dump(e) {
        console.log(e.toString({addressSpace: addressSpace}));
    }

    it("AddressSpace#addObject should create a 'hasTypeDefinition' reference on node", function () {


        var nbReferencesBefore = baseObjectType.findReferencesEx("HasTypeDefinition", BrowseDirection.Inverse).length;

        var node1 = addressSpace.addObject({
            browseName: "Node1",
            typeDefinition: "BaseObjectType"
        });

        //xx node1.findReferencesEx("References", BrowseDirection.Forward).forEach(dump);

        var forwardReferences = node1.findReferencesEx("References", BrowseDirection.Forward);
        forwardReferences.length.should.eql(1);

        forwardReferences[0].referenceTypeId.should.eql(hasTypeDefinitionReferenceType.nodeId);
        forwardReferences[0].isForward.should.eql(true);
        forwardReferences[0].nodeId.should.eql(baseObjectType.nodeId);

        var inverseReferences = node1.findReferencesEx("References", BrowseDirection.Inverse);
        inverseReferences.length.should.eql(0);

        var nbReferencesAfter = baseObjectType.findReferencesEx("HasTypeDefinition", BrowseDirection.Inverse).length;
        //xx console.log("",nbReferencesBefore,nbReferencesAfter);

        nbReferencesAfter.should.eql(nbReferencesBefore + 1, "we should have one more inverse reference more on the BaseObjectType");

    });

    function _test_with_custom_referenceType(referenceType) {

        var node1 = addressSpace.addObject({
            browseName: "Node1"
        });

        var nodeDest = addressSpace.addObject({
            browseName: "nodeDest"
        });



        node1.addReference({
            referenceType: referenceType,
            isForward: true,
            nodeId: nodeDest.nodeId
        });

        var forwardReferences1 = node1.findReferencesEx("References", BrowseDirection.Forward);
        var inverseReferences1 = node1.findReferencesEx("References", BrowseDirection.Inverse);

        forwardReferences1.length.should.eql(2);
        inverseReferences1.length.should.eql(0);
        forwardReferences1[1].nodeId.toString().should.eql(nodeDest.nodeId.toString());

        console.log(node1._references[0].toString({addressSpace: addressSpace}));
        console.log(node1._references[1].toString({addressSpace: addressSpace}));
    }

    it("BaseNode#addReference - referenceType as ReferenceType BrowseName", function () {
        _test_with_custom_referenceType("Organizes");
    });

    it("BaseNode#addReference - referenceType as nodeId String", function () {
        var referenceType = addressSpace.findReferenceType("Organizes");
        _test_with_custom_referenceType(referenceType.nodeId.toString());
    });

    it("BaseNode#addReference - referenceType as NodeId", function () {
        var referenceType = addressSpace.findReferenceType("Organizes");
        _test_with_custom_referenceType(referenceType.nodeId);
    });

    it("BaseNode#addReference - 2 nodes - should properly update backward references on referenced nodes", function () {


        var node1 = addressSpace.addObject({
            browseName: "Node1"
        });

        var nodeDest = addressSpace.addObject({
            browseName: "nodeDest"
        });

        node1.addReference({
            referenceType: "Organizes",
            isForward: true,
            nodeId: nodeDest.nodeId
        });

        var forwardReferences1 = node1.findReferencesEx("References", BrowseDirection.Forward);
        var inverseReferences1 = node1.findReferencesEx("References", BrowseDirection.Inverse);

        forwardReferences1.length.should.eql(2);
        inverseReferences1.length.should.eql(0);
        forwardReferences1[1].nodeId.toString().should.eql(nodeDest.nodeId.toString());


        var forwardReferencesDest = nodeDest.findReferencesEx("References", BrowseDirection.Forward);
        var inverseReferencesDest = nodeDest.findReferencesEx("References", BrowseDirection.Inverse);

        forwardReferencesDest.length.should.eql(1);
        inverseReferencesDest.length.should.eql(1);
        inverseReferencesDest[0].nodeId.toString().should.eql(node1.nodeId.toString());

    });

    it("BaseNode#addReference - 3 nodes - should properly update backward references on referenced nodes", function () {

        var node1 = addressSpace.addObject({
            browseName: "Node1"
        });

        var node2 = addressSpace.addObject({
            browseName: "Node2"
        });

        var nodeDest = addressSpace.addObject({
            browseName: "NodeDest"
        });

        node1.addReference({
            referenceType: "Organizes",
            isForward: true,
            nodeId: nodeDest.nodeId
        });

        node2.addReference({
            referenceType: "Organizes",
            isForward: true,
            nodeId: nodeDest.nodeId
        });

        var forwardReferences1 = node1.findReferencesEx("References", BrowseDirection.Forward);
        var inverseReferences1 = node1.findReferencesEx("References", BrowseDirection.Inverse);

        forwardReferences1.length.should.eql(2);
        inverseReferences1.length.should.eql(0);
        forwardReferences1[1].nodeId.toString().should.eql(nodeDest.nodeId.toString());

        var forwardReferences2 = node1.findReferencesEx("References", BrowseDirection.Forward);
        var inverseReferences2 = node1.findReferencesEx("References", BrowseDirection.Inverse);

        forwardReferences2.length.should.eql(2);
        inverseReferences2.length.should.eql(0);
        forwardReferences2[1].nodeId.toString().should.eql(nodeDest.nodeId.toString());

        var forwardReferencesDest = nodeDest.findReferencesEx("References", BrowseDirection.Forward);
        var inverseReferencesDest = nodeDest.findReferencesEx("References", BrowseDirection.Inverse);

        forwardReferencesDest.length.should.eql(1);
        inverseReferencesDest.length.should.eql(2);
        inverseReferencesDest[0].nodeId.toString().should.eql(node1.nodeId.toString());
        inverseReferencesDest[1].nodeId.toString().should.eql(node2.nodeId.toString());

    });

    it("BaseNode#addReference should throw if the same reference is added twice", function () {

        var node1 = addressSpace.addObject({
            browseName: "Node1"
        });

        var node2 = addressSpace.addObject({
            browseName: "Node2"
        });

        node1.addReference({
            referenceType: "Organizes",
            isForward: true,
            nodeId: node2.nodeId
        });

        should(function adding_the_same_reference_again() {
            node1.addReference({
                referenceType: "Organizes",
                isForward: true,
                nodeId: node2.nodeId
            });

        }).throwError();

    });

    it("BaseNode#addReference internal cache must be invalidated", function () {

        var node1 = addressSpace.addObject({
            browseName: "Node1"
        });


        // let call a method that caches results
        node1.getComponents().length.should.eql(0);

        var node2 = addressSpace.addObject({
            browseName: "Node2"
        });

        // let call a method that caches results
        node2.getComponents().length.should.eql(0);


        sinon.spy(node1, "_clear_caches");

        node1.addReference({
            referenceType: "HasComponent",
            isForward: true,
            nodeId: node2.nodeId
        });

        node1._clear_caches.callCount.should.eql(1);
        node1._clear_caches.restore();

        // let verify that cache has been cleared by calling method that caches results
        // and verifying that results has changed as expected
        node1.getComponents().length.should.eql(1);
        node2.getComponents().length.should.eql(0);

        node1.node2.browseName.toString().should.eql("Node2");
    });
    it("BaseNode#addReference (Inverse) internal cache must be invalidated", function () {

        var node1 = addressSpace.addObject({
            browseName: "Node1"
        });

        node1.getComponents().length.should.eql(0);

        var node2 = addressSpace.addObject({
            browseName: "Node2"
        });
        node2.getComponents().length.should.eql(0);


        node2.addReference({
            referenceType: "HasComponent",
            isForward: false,
            nodeId: node1.nodeId
        });

        node1.getComponents().length.should.eql(1);
        node2.getComponents().length.should.eql(0);

        node1.node2.browseName.toString().should.eql("Node2");

    });
});

