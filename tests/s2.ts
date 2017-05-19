"use strict";
import chai = require("chai");
import  mocha=require("mocha")
import rp=require("raml-1-parser");
let assert = chai.assert;
import path=require("path")
import fs=require("fs")
import main=require("../src/main")

function loadApi(name: string) {
    var rs = <rp.api10.Api>rp.loadRAMLSync(path.resolve(__dirname, "../../tests/ramls/" + name + ".raml"), []);
    var s = rs.expand(true).toJSON({serializeMetadata: false});
    var result = main.loadApi(s);
    return result;
}
function loadLibrary(name: string) {
    var rs = <rp.api10.Api>rp.loadRAMLSync(path.resolve(__dirname, "../../tests/ramls/" + name + ".raml"), []);
    var s = rs.toJSON({serializeMetadata: false});
    var result = main.loadLibrary(s);
    return result;
}

describe("structure tests", function () {
    it("test0", function () {
        var l = loadApi("test0");
        assert(l.title() == "Test0");
        assert(l.baseUri() == "http:/hello.com/q")
        let r = l.resources()[0]
        assert(r.relativeUrl() == "/hello")
        assert(r.resources()[0].relativeUrl() == "/q")
        assert(r.absoluteUrl() == "http:/hello.com/q/hello")
        assert(r.resources()[0].fullRelativeUrl() == "/hello/q")
        assert(r.methods()[0].method() == "get")
        var m = r.methods()[0];
        assert(m.responses()[0].code() == "200");
    })
    it("test1", function () {
        var l = loadApi("test0");
        let r = l.resources()[0]
        var m = r.methods()[0];
        var body=m.responses()[0].bodies()[0]
        assert(body.mimeType()=="application/json")
        assert(body.type().isObject());

    })
    it("test2", function () {
        var l = loadApi("test1");
        let r = l.resources()[0]
        var m = r.methods()[0];
        var body=m.bodies()[0]
        assert(body.mimeType()=="application/json")
        assert(body.type().isObject());
        assert(!body.type().property("y").required());
        assert(body.type().properties()[1].name()=="x");
        assert(body.type().properties()[1].required());
        assert(body.type().properties()[1].range().isNumber());
        assert(body.type().properties()[1].declaredAt()==body.type());
    })
    it("test3", function () {
        var l = loadApi("test3");
        let r = l.resources()[0]
        var m = r.methods()[0];
        assert(m.parameters().length==2)
        assert(m.parameters()[0].required())
        assert(m.parameters()[0].type().isNumber())
        assert(!m.parameters()[1].required())
    })
    it("test4", function () {
        var l = loadApi("test4");
        let r = l.resources()[0]
        var m = r.methods()[0];
        assert(m.parameters().length==3)
        assert(m.parameters()[0].required())
        assert(m.parameters()[0].name()=='q')
    })
    it("test5", function () {
        var l = loadApi("test5");
        let r = l.resources()[0].resources()[0]
        var m = r.methods()[0];
        assert(m.parameters().length==4)
        assert(m.parameters()[0].required())
        assert(m.parameters()[0].name()=='hello')
        assert(m.parameters()[0].type().isString())
        assert(m.parameters()[1].name()=='q')
        assert(m.parameters()[1].type().isNumber())
    })
    it("test6", function () {
        var l = loadApi("test6");
        let r = l.resources()[0]
        var m = r.methods()[0];
        var h=m.responses()[0].headers()[0]
        assert(h.name()=="hh")
    })
    it("test7", function () {
        var l = loadLibrary("types");
        var hid=l.getType("HasId");
        assert(hid.allSubTypes()[0].properties().length==5);
        assert(!hid.allSubTypes()[0].property("pets").required())
        assert(hid.allSubTypes()[0].property("age").required())
        assert(hid.allSubTypes()[0].property("pets").range().componentType().name()=="Named")
        assert(l.getType("Company").property("ownedBy").range().isUnion())
        assert(l.getType("Company").property("ownedBy").range().allOptions().length==3)
    })
    it("test8", function () {
        var l = loadApi("test7");
        assert(l.securitySchemes().length==2)
        assert(l.securitySchemes()[0].name()=='oauth_2_0');
        assert(l.securitySchemes()[0].settings()['authorizationUri']=='https://www.dropbox.com/1/oauth2/authorize');
    })
    it("test9", function () {
        var l = loadApi("test8");
        assert(l.securedBy().length==1)
        assert(l.securedBy()[0]==null)

        var ss=l.resources()[0].methods()[0].securedBy()[0]
        assert(ss.name()=="oauth_1_0")
        var ss=l.resources()[0].securedBy()[0]
        assert(ss.name()=="oauth_1_0")
        assert(ss.settings()["scope"]=="A")
    })
    it("test10", function () {
        var l = loadApi("test9");

        var ss=l.resources()[0].methods()[0].securedBy()[0]
        assert(ss.name()=="oauth_1_0")
        assert(ss.settings()["scope"]=="A")
    })
    it("test11", function () {
        var l = loadLibrary("types");
        let ex=l.getType("Items").examples()
        assert(ex.length==0);
    })
    it("test12", function () {
        var l = loadLibrary("test10");
        let ex=l.getType("HasId").examples()
        assert(ex.length==1);
        assert(ex[0].value().id==2)
        var an=ex[0].annotations()[0];
        assert(an.name()=="Hello")
        assert(an.definition().name()=="Hello")
        assert(an.value()=="H")

        let ex1=l.getType("HasId2").examples()
        assert(ex1.length==2);
        assert(ex1[0].value().id==2)
        var an=ex1[0].annotations()[0];
        assert(an.name()=="Hello")
        assert(an.definition().name()=="Hello")
        assert(an.value()=="H")

        let ex2=l.getType("HasId0").examples()
        assert(ex2.length==1);
        assert(ex2[0].value().id==2)
    })
    it("test13", function () {
        var l = loadLibrary("test11");
        var a0=l.annotations()[0];
        assert(a0.value()=="A")
        var a0=l.annotations()[1];
        assert(a0.value().name=="B")
        assert(a0.definition().name()=="H2")
    })
    it("test14", function () {
        var lib = loadLibrary("test12");
        var l=lib.getAnnotationType("H2")
        var a0=l.annotations()[0];
        assert(a0.value().name=="B")
        assert(a0.definition().name()=="H2")
        var rr=l.property("name").range().annotations();
        var a0=rr[0];
        assert(a0.value().name=="A")
        assert(a0.definition().name()=="H2")
    })
    it("test15", function () {
        var lib = loadLibrary("test14");
        var l=lib.getType("OwnedBy")

        assert(l.allOptions().length==3);
    })
})
