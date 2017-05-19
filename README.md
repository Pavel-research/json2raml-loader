# JSON2RAML Loader

This repository contains lighweight API on top of JSON Serialization of RAML files. It uses interfaces described in [RAML Domain Model] (https://github.com/petrochenko-pavel-a/raml-domain-model) to represent semantic of the RAML file.


### Usage:

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
```
