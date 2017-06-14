import rt=require("raml-typesystem-interfaces")
import ti=rt.tsInterfaces;
import ts=require("raml-typesystem-light")
import rjson=require("raml1-json-typings")
import raml=require("raml1-domain-model");

function normalizeTypes(target: any, base: any, types: string, resultName: string = types) {
    if (base[types]) {
        base[types].forEach(t => {
            var nm = Object.keys(t)[0];
            var type: rjson.TypeReference = t[Object.keys(t)[0]];
            if (typeof t == "string") {
                target[resultName][nm] = t;
            }
            else if (Array.isArray(t)) {
                target[resultName][nm] = {type: t};
            }
            else {
                target[resultName][nm] = normalizeType(<any>type);
            }
        })
    }
}
function normalizeType(i: rjson.Type|string| string[]) {
    if (typeof i == "string") {
        return {type: i};
    }

    if (typeof i == "object") {
        if (Array.isArray(i)) {
            return {type: i};
        }
        let t: rjson.Type = <rjson.Type>i;
        var res: any = JSON.parse(JSON.stringify(t));
        delete res.name;
        delete res.typePropertyKind;
        delete res.annotations;
        delete res.structuredExample;
        if (t.structuredExample) {
            var e = {

                value: t.structuredExample.structuredValue
            }
            if (t.structuredExample.annotations) {
                Object.keys(t.structuredExample.annotations).forEach(x => {
                    e['(' + x + ')'] = t.structuredExample.annotations[x].structuredValue;
                });
            }
            res.example = e;
        }
        if (t.examples) {

            var examples = [];
            t.examples.forEach(e => {
                var ex = {value: e.structuredValue};
                if (e.annotations) {
                    Object.keys(e.annotations).forEach(x => {
                        ex['(' + x + ')'] = e.annotations[x].structuredValue;
                    });
                }
                examples.push(ex);
            })

            res.examples = examples;
        }
        if (t.annotations) {
            Object.keys(t.annotations).forEach(x => {
                res['(' + x + ")"] = t.annotations[x].structuredValue;
            })
        }
        if (t.properties) {
            Object.keys(t.properties).forEach(x => {
                res.properties[x] = normalizeType(t.properties[x]);
            })
        }
        if (t.facets) {
            Object.keys(t.facets).forEach(x => {
                res.facets[x] = normalizeType(t.facets[x]);
            })
        }
    }
    return res;
}

function normalize(api: rjson.LibraryBase) {
    var rs: any = {types: {}, annotationTypes: {}};
    normalizeTypes(rs, api, "types");
    normalizeTypes(rs, api, "schemas");
    normalizeTypes(rs, api, "annotationTypes");
    return rs;
}
export abstract class Annotated{
    annotation(n:string){
        var res: ti.IAnnotation = null;
        this.annotations().forEach(x => {
            if (x.name() == n || x.name().endsWith("." + n)) {
                res = x;
            }
        })
        if (res) {
            return res.value();
        }
        return null;
    }
    abstract annotations(): ti.IAnnotation[]
}
export abstract class Proxy<JSONType extends rjson.Annotable> extends  Annotated implements ti.IAnnotatedElement {

    constructor(public readonly json: JSONType, public readonly parent: Proxy<any>) {
        super();
    }

    abstract name();

    abstract kind();

    owningFragment(): FragmentBase<any> {
        if (this.parent) {
            return this.parent.owningFragment();
        }
        if (this instanceof FragmentBase) {
            return <any>this;
        }
        return null;
    }

    description() {
        return (<any>this.json).description || (<any>this.json).usage
    }

    annotationsMap() {
        return null;
    }

    private _annotations;


    annotations(): ti.IAnnotation[] {
        if (this._annotations) {
            return this._annotations;
        }
        let result: Annotation[] = [];
        if (this.json.annotations) {
            Object.keys(this.json.annotations).forEach(x => {
                var v = this.json.annotations[x];
                result.push(new Annotation(v, this));
            })
        }
        this._annotations = result;
        return this._annotations;
    }

    value() {
        return this.json;
    }

    entry() {
        return this.json;
    }

}

export class Annotation extends Proxy<rjson.Annotation> implements raml.IAnnotation {


    name(): string {
        return this.json.name;
    }

    isInheritable() {
        return false;
    }

    facetName() {
        return this.json.name;
    }

    owner() {
        return null;
    }

    ownerFacet() {
        return null;
    }

    kind() {
        return "Annotation"
    }

    value() {
        return this.json.structuredValue;
    }

    definition(): raml.Type {
        let library: FragmentBase<any> = this.owningFragment();
        var tp = library.getAnnotationType(this.json.name);
        if (tp) {
            return tp;
        }
        return null;
    }
}


function unique(v: any[]) {
    return Array.from(new Set(v))
}

export abstract class FragmentBase<T> extends Proxy<T> {


    constructor(node: any, private tc: ti.IParsedTypeCollection) {
        super(node, null);
    }

    getType(name: string): raml.Type {
        return this.tc.getType(name)
    }

    getTypeRegistry() {
        return this.tc.getTypeRegistry();
    }

    getAnnotationTypeRegistry() {
        return this.tc.getAnnotationTypeRegistry();
    }

    types() {
        return unique(this.tc.types())
    }

    annotationTypes() {
        return unique(this.tc.annotationTypes());
    }

    getAnnotationType(name: string): raml.Type {
        return this.tc.getAnnotationType(name);
    }

}

export function mapArray<T extends Proxy<any>>(parent: Proxy<any>, property: string, clazz: {new(v: any, parent: Proxy<any>): T}): T[] {
    var obj = parent.json[property];
    if (!obj) {
        obj = [];
    }
    return obj.map(x => x == null ? x : new clazz(x, parent));
}
export function mapArrayMaps<T extends Proxy<any>>(parent: Proxy<any>, property: string, clazz: {new(v: any, parent: Proxy<any>): T}): T[] {
    var obj = parent.json[property];
    if (!obj) {
        obj = [];
    }
    return obj.map(x => new clazz(x[Object.keys(x)[0]], parent));
}
export function mapMap<T extends Proxy<any>>(parent: Proxy<any>, property: string, clazz: {new(v: any, parent: Proxy<any>): T}): T[] {
    var obj = parent.json[property];
    if (!obj) {
        obj = {};
    }
    var res: T[] = [];
    Object.keys(obj).forEach(x => {
        res.push(new clazz(obj[x], parent))
    })
    return res;
}

function gatherResources(r: Api|raml.Resource, res: raml.Resource[]) {
    var resources: raml.Resource[] = r.resources();
    resources.forEach(x => {
        res.push(x);
        gatherResources(x, res);
    })
}
export abstract class LibraryBase<T> extends FragmentBase<T> {

    securitySchemes() {
        return mapArrayMaps<SecuritySchemeDefinition>(this, "securitySchemes", SecuritySchemeDefinition);
    }
}
export class SecuritySchemeRef extends Proxy<rjson.SecuritySchemeRef> implements raml.SecuredBy {

    name() {
        if (typeof this.json == "string") {
            return this.json;
        }
        return Object.keys(this.json)[0];
    }

    settings() {
        if (typeof this.json == "string") {
            return {}
        }
        return (<any>this.json)[Object.keys(this.json)[0]];
    }

    kind() {
        return "SecuritySchemeRef";
    }

    securitySchemes() {
        return mapArrayMaps<SecuritySchemeDefinition>(this, "securitySchemes", SecuritySchemeDefinition);
    }
}
export class Documentation extends  Proxy<rjson.DocumentationItem>{

    name(){
        return this.json.title;
    }

    title(){
        return this.json.title;
    }
    content(){
        return this.json.content;
    }

    kind(){
        return "Documentation"
    }
}
export class Api extends LibraryBase<rjson.Api> implements raml.Api {

    baseUri(): string {
        return this.json.baseUri;
    }
    protocols(){
        return this.json.protocols;
    }
    mediaType(){
        var s= this.json.mediaType
        if (typeof s=="string"){
            return [s];
        }
        else{
            return s;
        }
    }
    baseUriParameters(){
        if (this.json.baseUriParameters) {
            return params(this.json.baseUriParameters,this,"baseUri");
        }
        return []
    }

    documentation() {
        return mapArray(this, "documentation", Documentation)
    }

    securedBy() {
        return mapArray(this, "securedBy", SecuritySchemeRef)
    }

    version(): string {
        return this.json.version;
    }

    kind() {
        return "Api";
    }

    name() {
        return this.title();
    }

    title() {
        return this.json.title;
    }

    resources() {
        return mapArray<Resource>(this, "resources", Resource);
    }

    allResources() {
        var res: raml.Resource[] = []
        gatherResources(this, res);
        return res;
    }

    allMethods() {
        var meth: raml.Method[] = [];
        this.allResources().forEach(x => {
            meth = meth.concat(x.methods());
        })
        return meth;
    }
}

function bodies(t: Method|Response) {
    if (!t.json.body) {
        return [];
    }
    var result: Body[] = []
    Object.keys(t.json.body).forEach(x => {
        let td = normalizeType(t.json.body[x]);
        var parsedType = ts.parseJsonTypeWithCollection("", td, <any>t.owningFragment(), true);
        result.push(new Body(x, parsedType));
    });
    return result;
}
function isRequired(parsedType: ti.IParsedType) {
    return parsedType.allFacets().some(x => x.kind() == ti.MetaInformationKind.Required && x.value());
}
function params(v: rjson.Types, parent: Proxy<any>, location: string) {

    var result: Parameter[] = []
    if (v) {
        Object.keys(v).forEach(x => {
            let td = normalizeType(v[x]);
            var parsedType = ts.parseJsonTypeWithCollection("", td, <any>parent.owningFragment(), false);
            result.push(new Parameter(x, parsedType, isRequired(parsedType), location));
        });
    }
    return result;
}
function paramsFromArray(v: rjson.Type[], parent: Proxy<any>, location: string) {

    var result: Parameter[] = []
    if (v) {
        v.forEach(x => {
            let td = normalizeType(x);
            var parsedType = ts.parseJsonTypeWithCollection("", td, <any>parent.owningFragment(), false);
            result.push(new Parameter(x.name, parsedType, isRequired(parsedType), location));
        });
    }
    return result;
}

export class Response extends Proxy<rjson.Response> implements raml.Response {
    name() {
        return this.json.code;
    }

    code() {
        return this.json.code;
    }

    headers() {
        return paramsFromArray(this.json.headers, this, "responseHeaders");
    }

    bodies() {
        return bodies(this);
    }

    method() {
        return <Method>this.parent;
    }

    kind() {
        return "Response"
    }
}
export class Body extends Annotated implements raml.Body {

    constructor(private mime: string, private p: ti.IParsedType) {
        super()
    }

    mimeType() {
        return this.mime;
    }

    type() {
        return this.p;
    }

    annotations() {
        return this.p.annotations();
    }
}
export class Parameter extends  Annotated implements raml.Parameter {

    constructor(private mime: string, private p: ti.IParsedType, private req: boolean, private loc: string) {
        super();
    }

    required() {
        return this.req;
    }

    location() {
        return this.loc;
    }

    name() {
        return this.mime;
    }

    type() {
        return this.p;
    }

    annotations() {
        return this.p.annotations();
    }
}

export class Method extends Proxy<rjson.Method> implements raml.Method {
    name() {
        return this.json.method
    }

    protocols(){
        if (this.json.protocols){
            return this.json.protocols;
        }
        return []
    }

    securedBy(): raml.SecuredBy[] {
        if (!this.json.securedBy && this.resource()) {
            return this.resource().securedBy();
        }
        return mapArray(this, "securedBy", SecuritySchemeRef)
    }

    kind() {
        return "Method"
    }

    displayName() {
        return this.json.displayName;
    }

    method() {
        return this.json.method;
    }

    parameters() {
        var initial: raml.Parameter[] = params(this.json.queryParameters, this, "query").concat(params(this.json.headers, this, "headers"))
        initial = this.resource().allUriParameters().concat(initial);
        if (this.json.queryString) {
            let td = normalizeType(this.json.queryString);
            var parsedType = ts.parseJsonTypeWithCollection("", td, <any>parent, false);
            initial.push(new Parameter("queryString", parsedType, isRequired(parsedType), "queryString"));
        }
        return initial;
    }

    bodies() {
        return bodies(this);
    }

    responses() {
        return mapMap(this, "responses", Response);
    }

    resource(): Resource {
        if (this.parent instanceof Resource) {
            return this.parent;
        }
        return null;
    }
}
/**
 *
 */
export class Library extends LibraryBase<rjson.Library> {

    usage() {
        return this.json.usage;
    }

    kind() {
        return "Library";
    }

    name() {
        return "";
    }
}
export class SecuritySchemeDefinition extends Proxy<rjson.SecuritySchemeDefinition> implements raml.SecuritySchemeDefinition {

    settings() {
        return this.json.settings;
    }

    type() {
        return this.json.type;
    }

    name() {
        return this.json.name;
    }

    kind() {
        return "SecuritySchemeDefinition"
    }
}

export class Resource extends Proxy<rjson.Resource> implements raml.Resource {

    securedBy(): raml.SecuredBy[] {
        if (!this.json.securedBy && this.owningApi()) {
            return this.owningApi().securedBy();
        }
        return mapArray(this, "securedBy", SecuritySchemeRef)
    }

    relativeUrl() {
        return this.json.relativeUri;
    }

    fullRelativeUrl() {
        let m = this.json.relativeUri;
        let pr = this.parentResource();
        if (pr) {
            m = pr.fullRelativeUrl() + m;
        }
        return m;
    }

    absoluteUrl() {
        return this.json.absoluteUri;
    }

    parentResource(): raml.Resource {
        if (this.parent instanceof Resource) {
            return this.parent;
        }
        return null;
    }

    uriParameters() {
        return params(this.json.uriParameters, this, "uri");
    }

    allUriParameters() {
        let p = this.parentResource();
        if (p) {
            return p.uriParameters().concat(this.uriParameters())
        }
        return this.uriParameters();
    }

    resources(): raml.Resource[] {
        return mapArray<Resource>(this, "resources", Resource);
    }

    owningApi() {
        return <raml.Api><any>this.owningFragment();
    }

    methods() {
        return mapArray<Method>(this, "methods", Method);
    }

    name() {
        return this.json.displayName;
    }

    kind() {
        return "Resource";
    }
}

export function loadApi(api: rjson.Api): raml.Api {
    var nm = normalize(api);
    var collection = ts.parseJSONTypeCollection(nm);
    return new Api(api, collection);
}

export function loadLibrary(api: rjson.Library): raml.Library {
    var nm = normalize(api);
    var collection = ts.parseJSONTypeCollection(nm);
    return new Library(api, collection);
}