# JSON2RAML Loader

This repository contains lighweight API on top of JSON Serialization of RAML files. It uses interfaces described in [RAML Domain Model](https://github.com/petrochenko-pavel-a/raml-domain-model) to represent semantic of the RAML file.

Comparing to using plain JSON it has following benefits:
* Full understanding of RAML typesystem.
* Property types are standartized, so no more null|string| string[] as property value
* Concepts which has diferent syntax but same semantic are unified in one

### Usage:

You may use it to parse RAML model which is stored in JSON:

```javascript
import json2raml=require("json2raml-loader")
var apiJson={
    "title": "Test0",
    "baseUri": "http:/hello.com/q",
    "protocols": [
        "HTTP"
    ],
    "resources": [
        {
            "methods": [
                {
                    "responses": {
                        "200": {
                            "code": "200",
                            "body": {
                                "application/json": {
                                    "name": "application/json",
                                    "displayName": "application/json",
                                    "typePropertyKind": "TYPE_EXPRESSION",
                                    "type": [
                                        "object"
                                    ]
                                }
                            }
                        }
                    },
                    "protocols": [
                        "HTTP"
                    ],
                    "method": "get"
                }
            ],
            "relativeUri": "/hello",
            "displayName": "/hello",
            "resources": [
                {
                    "relativeUri": "/q",
                    "displayName": "/q",
                    "relativeUriPathSegments": [
                        "q"
                    ],
                    "absoluteUri": "http:/hello.com/q/hello/q"
                }
            ],
            "relativeUriPathSegments": [
                "hello"
            ],
            "absoluteUri": "http:/hello.com/q/hello"
        }
    ]
};
var apiModel=json2raml.loadApi(apiJson);
console.log(apiModel.resources());
```

Alternatively you may load an API using RAML parse and then wrap it to get better view on it:
```javascript
var rs = <rp.api10.Api>rp.loadRAMLSync("myApi.raml"), []);
var s = rs.expand(true).toJSON({serializeMetadata: false});
var result = json2raml.loadApi(s);
```
### Working with types

One area where `json2raml-loader` shows it's strength is working with types and annotations. Being based on the native typesystem it allows you to browse through types using native typesystem capabilities:

for example you can do things like this:

```javascript
var tp=loadedApi.getType("HasId");
if (tp.isObject()){
  allProperties=tp.properties();
  declaredProperties=tp.declaredProperties();
  allSuperTypes=tp.allSuperTypes();
}
```


### Status 

All HTTP level abstractions defined in RAML are fully supported, typesystem is supported natively using lightweight version of [RAML typesystem](https://github.com/petrochenko-pavel-a/raml-typesystem-light)

Code is not well tested in production yet, so some quirks are possible.
