const MatchAndReplaceTests = {
    "M&RMass":{
        "actions": [
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestBodyRawRegexTerm",
                "section": "SectionRequestBody",
                "operation": "OperationBodyRaw",
                "matcherType": "MatcherRawRegex",
                "matcher": ".*",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestBodyRawRegexWorkflow",
                "section": "SectionRequestBody",
                "operation": "OperationBodyRaw",
                "matcherType": "MatcherRawRegex",
                "matcher": ".*",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestBodyRawValueTerm",
                "section": "SectionRequestBody",
                "operation": "OperationBodyRaw",
                "matcherType": "MatcherRawValue",
                "matcher": "test",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestBodyRawValueWorkflow",
                "section": "SectionRequestBody",
                "operation": "OperationBodyRaw",
                "matcherType": "MatcherRawValue",
                "matcher": "test",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestBodyRawFullTerm",
                "section": "SectionRequestBody",
                "operation": "OperationBodyRaw",
                "matcherType": "MatcherRawFull",
                "matcher": "",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestBodyRawFullWorkflow",
                "section": "SectionRequestBody",
                "operation": "OperationBodyRaw",
                "matcherType": "MatcherRawFull",
                "matcher": "",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseBodyRawRegexTerm",
                "section": "SectionResponseBody",
                "operation": "OperationBodyRaw",
                "matcherType": "MatcherRawRegex",
                "matcher": ".*",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseBodyRawRegexWorkflow",
                "section": "SectionResponseBody",
                "operation": "OperationBodyRaw",
                "matcherType": "MatcherRawRegex",
                "matcher": ".*",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseBodyRawValueTerm",
                "section": "SectionResponseBody",
                "operation": "OperationBodyRaw",
                "matcherType": "MatcherRawValue",
                "matcher": "test",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseBodyRawValueWorkflow",
                "section": "SectionResponseBody",
                "operation": "OperationBodyRaw",
                "matcherType": "MatcherRawValue",
                "matcher": "test",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseBodyRawFullTerm",
                "section": "SectionResponseBody",
                "operation": "OperationBodyRaw",
                "matcherType": "MatcherRawFull",
                "matcher": "",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseBodyRawFullWorkflow",
                "section": "SectionResponseBody",
                "operation": "OperationBodyRaw",
                "matcherType": "MatcherRawFull",
                "matcher": "",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestFirstLineRawRegexTerm",
                "section": "SectionRequestFirstLine",
                "operation": "OperationFirstLineRaw",
                "matcherType": "MatcherRawRegex",
                "matcher": ".*",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestFirstLineRawRegexWorkflow",
                "section": "SectionRequestFirstLine",
                "operation": "OperationFirstLineRaw",
                "matcherType": "MatcherRawRegex",
                "matcher": ".*",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestFirstLineRawValueTerm",
                "section": "SectionRequestFirstLine",
                "operation": "OperationFirstLineRaw",
                "matcherType": "MatcherRawValue",
                "matcher": "test",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestFirstLineRawValueWorkflow",
                "section": "SectionRequestFirstLine",
                "operation": "OperationFirstLineRaw",
                "matcherType": "MatcherRawValue",
                "matcher": "test",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestFirstLineRawFullTerm",
                "section": "SectionRequestFirstLine",
                "operation": "OperationFirstLineRaw",
                "matcherType": "MatcherRawFull",
                "matcher": "",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestFirstLineRawFullWorkflow",
                "section": "SectionRequestFirstLine",
                "operation": "OperationFirstLineRaw",
                "matcherType": "MatcherRawFull",
                "matcher": "",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseFirstLineRawRegexTerm",
                "section": "SectionResponseFirstLine",
                "operation": "OperationFirstLineRaw",
                "matcherType": "MatcherRawRegex",
                "matcher": ".*",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseFirstLineRawRegexWorkflow",
                "section": "SectionResponseFirstLine",
                "operation": "OperationFirstLineRaw",
                "matcherType": "MatcherRawRegex",
                "matcher": ".*",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseFirstLineRawValueTerm",
                "section": "SectionResponseFirstLine",
                "operation": "OperationFirstLineRaw",
                "matcherType": "MatcherRawValue",
                "matcher": "test",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseFirstLineRawValueWorkflow",
                "section": "SectionResponseFirstLine",
                "operation": "OperationFirstLineRaw",
                "matcherType": "MatcherRawValue",
                "matcher": "test",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseFirstLineRawFullTerm",
                "section": "SectionResponseFirstLine",
                "operation": "OperationFirstLineRaw",
                "matcherType": "MatcherRawFull",
                "matcher": "",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseFirstLineRawFullWorkflow",
                "section": "SectionResponseFirstLine",
                "operation": "OperationFirstLineRaw",
                "matcherType": "MatcherRawFull",
                "matcher": "",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseStatusCodeUpdateTerm",
                "section": "SectionResponseStatusCode",
                "operation": "OperationStatusCodeUpdate",
                "matcherType": null,
                "matcher": null,
                "replacerType": "ReplacerTerm",
                "replacer": "200",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseStatusCodeUpdateWorkflow",
                "section": "SectionResponseStatusCode",
                "operation": "OperationStatusCodeUpdate",
                "matcherType": null,
                "matcher": null,
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestHeaderRawRegexTerm",
                "section": "SectionRequestHeader",
                "operation": "OperationHeaderRaw",
                "matcherType": "MatcherRawRegex",
                "matcher": ".*",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestHeaderRawRegexWorkflow",
                "section": "SectionRequestHeader",
                "operation": "OperationHeaderRaw",
                "matcherType": "MatcherRawRegex",
                "matcher": ".*",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestHeaderRawValueTerm",
                "section": "SectionRequestHeader",
                "operation": "OperationHeaderRaw",
                "matcherType": "MatcherRawValue",
                "matcher": "test",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestHeaderRawValueWorkflow",
                "section": "SectionRequestHeader",
                "operation": "OperationHeaderRaw",
                "matcherType": "MatcherRawValue",
                "matcher": "test",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestHeaderRawFullTerm",
                "section": "SectionRequestHeader",
                "operation": "OperationHeaderRaw",
                "matcherType": "MatcherRawFull",
                "matcher": "",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestHeaderRawFullWorkflow",
                "section": "SectionRequestHeader",
                "operation": "OperationHeaderRaw",
                "matcherType": "MatcherRawFull",
                "matcher": "",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestHeaderUpdateNameTerm",
                "section": "SectionRequestHeader",
                "operation": "OperationHeaderUpdate",
                "matcherType": "MatcherName",
                "matcher": "Content-Type",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestHeaderUpdateNameWorkflow",
                "section": "SectionRequestHeader",
                "operation": "OperationHeaderUpdate",
                "matcherType": "MatcherName",
                "matcher": "Content-Type",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestHeaderAddNameTerm",
                "section": "SectionRequestHeader",
                "operation": "OperationHeaderAdd",
                "matcherType": "MatcherName",
                "matcher": "X-Custom-Header",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestHeaderAddNameWorkflow",
                "section": "SectionRequestHeader",
                "operation": "OperationHeaderAdd",
                "matcherType": "MatcherName",
                "matcher": "X-Custom-Header",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestHeaderRemoveName",
                "section": "SectionRequestHeader",
                "operation": "OperationHeaderRemove",
                "matcherType": "MatcherName",
                "matcher": "X-Custom-Header",
                "replacerType": null,
                "replacer": null,
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseHeaderRawRegexTerm",
                "section": "SectionResponseHeader",
                "operation": "OperationHeaderRaw",
                "matcherType": "MatcherRawRegex",
                "matcher": ".*",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseHeaderRawRegexWorkflow",
                "section": "SectionResponseHeader",
                "operation": "OperationHeaderRaw",
                "matcherType": "MatcherRawRegex",
                "matcher": ".*",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseHeaderRawValueTerm",
                "section": "SectionResponseHeader",
                "operation": "OperationHeaderRaw",
                "matcherType": "MatcherRawValue",
                "matcher": "test",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseHeaderRawValueWorkflow",
                "section": "SectionResponseHeader",
                "operation": "OperationHeaderRaw",
                "matcherType": "MatcherRawValue",
                "matcher": "test",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseHeaderRawFullTerm",
                "section": "SectionResponseHeader",
                "operation": "OperationHeaderRaw",
                "matcherType": "MatcherRawFull",
                "matcher": "",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseHeaderRawFullWorkflow",
                "section": "SectionResponseHeader",
                "operation": "OperationHeaderRaw",
                "matcherType": "MatcherRawFull",
                "matcher": "",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseHeaderUpdateNameTerm",
                "section": "SectionResponseHeader",
                "operation": "OperationHeaderUpdate",
                "matcherType": "MatcherName",
                "matcher": "Content-Type",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseHeaderUpdateNameWorkflow",
                "section": "SectionResponseHeader",
                "operation": "OperationHeaderUpdate",
                "matcherType": "MatcherName",
                "matcher": "Content-Type",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseHeaderAddNameTerm",
                "section": "SectionResponseHeader",
                "operation": "OperationHeaderAdd",
                "matcherType": "MatcherName",
                "matcher": "X-Custom-Header",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseHeaderAddNameWorkflow",
                "section": "SectionResponseHeader",
                "operation": "OperationHeaderAdd",
                "matcherType": "MatcherName",
                "matcher": "X-Custom-Header",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "ResponseHeaderRemoveName",
                "section": "SectionResponseHeader",
                "operation": "OperationHeaderRemove",
                "matcherType": "MatcherName",
                "matcher": "X-Custom-Header",
                "replacerType": null,
                "replacer": null,
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestQueryRawRegexTerm",
                "section": "SectionRequestQuery",
                "operation": "OperationQueryRaw",
                "matcherType": "MatcherRawRegex",
                "matcher": ".*",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestQueryRawRegexWorkflow",
                "section": "SectionRequestQuery",
                "operation": "OperationQueryRaw",
                "matcherType": "MatcherRawRegex",
                "matcher": ".*",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestQueryRawValueTerm",
                "section": "SectionRequestQuery",
                "operation": "OperationQueryRaw",
                "matcherType": "MatcherRawValue",
                "matcher": "test",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestQueryRawValueWorkflow",
                "section": "SectionRequestQuery",
                "operation": "OperationQueryRaw",
                "matcherType": "MatcherRawValue",
                "matcher": "test",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestQueryRawFullTerm",
                "section": "SectionRequestQuery",
                "operation": "OperationQueryRaw",
                "matcherType": "MatcherRawFull",
                "matcher": "",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestQueryRawFullWorkflow",
                "section": "SectionRequestQuery",
                "operation": "OperationQueryRaw",
                "matcherType": "MatcherRawFull",
                "matcher": "",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestQueryUpdateNameTerm",
                "section": "SectionRequestQuery",
                "operation": "OperationQueryUpdate",
                "matcherType": "MatcherName",
                "matcher": "id",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestQueryUpdateNameWorkflow",
                "section": "SectionRequestQuery",
                "operation": "OperationQueryUpdate",
                "matcherType": "MatcherName",
                "matcher": "id",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestQueryAddNameTerm",
                "section": "SectionRequestQuery",
                "operation": "OperationQueryAdd",
                "matcherType": "MatcherName",
                "matcher": "newParam",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestQueryAddNameWorkflow",
                "section": "SectionRequestQuery",
                "operation": "OperationQueryAdd",
                "matcherType": "MatcherName",
                "matcher": "newParam",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestQueryRemoveName",
                "section": "SectionRequestQuery",
                "operation": "OperationQueryRemove",
                "matcherType": "MatcherName",
                "matcher": "id",
                "replacerType": "ReplacerTerm",
                "replacer": "abc",
                "query": "",
                "collectionId": ""
            }
            }, 
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestMethodUpdateTerm",
                "section": "SectionRequestMethod",
                "operation": "OperationMethodUpdate",
                "matcherType": null,
                "matcher": null,
                "replacerType": "ReplacerTerm",
                "replacer": "POST",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestMethodUpdateWorkflow",
                "section": "SectionRequestMethod",
                "operation": "OperationMethodUpdate",
                "matcherType": null,
                "matcher": null,
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestPathRawRegexTerm",
                "section": "SectionRequestPath",
                "operation": "OperationPathRaw",
                "matcherType": "MatcherRawRegex",
                "matcher": ".*",
                "replacerType": "ReplacerTerm",
                "replacer": "/api/v1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestPathRawRegexWorkflow",
                "section": "SectionRequestPath",
                "operation": "OperationPathRaw",
                "matcherType": "MatcherRawRegex",
                "matcher": ".*",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestPathRawValueTerm",
                "section": "SectionRequestPath",
                "operation": "OperationPathRaw",
                "matcherType": "MatcherRawValue",
                "matcher": "/api/v1/users",
                "replacerType": "ReplacerTerm",
                "replacer": "/api/v2/users",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestPathRawValueWorkflow",
                "section": "SectionRequestPath",
                "operation": "OperationPathRaw",
                "matcherType": "MatcherRawValue",
                "matcher": "/api/v1/users",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestPathRawFullTerm",
                "section": "SectionRequestPath",
                "operation": "OperationPathRaw",
                "matcherType": "MatcherRawFull",
                "matcher": "",
                "replacerType": "ReplacerTerm",
                "replacer": "/api/v1/users",
                "query": "",
                "collectionId": ""
            }
            },
            {
            "name": "addMatchAndReplace",
            "parameters": {
                "name": "RequestPathRawFullWorkflow",
                "section": "SectionRequestPath",
                "operation": "OperationPathRaw",
                "matcherType": "MatcherRawFull",
                "matcher": "",
                "replacerType": "ReplacerWorkflow",
                "replacer": "g:1",
                "query": "",
                "collectionId": ""
            }
            }
        ]
    }
}

export const ActiveEditorTests = {
    "activeEditorTests": {
        "actions": [
            {
                "name": "activeEditorReplaceSelection",
                "parameters": {
                    "text": "replacement text"
                }
            },
            {
                "name": "activeEditorReplaceByString", 
                "parameters": {
                    "match": "find this",
                    "replace": "replace with this"
                }
            },
            {
                "name": "activeEditorReplaceBody",
                "parameters": {
                    "body": "new request body"
                }
            },
            {
                "name": "activeEditorAddHeader",
                "parameters": {
                    "header": "Authorization: Bearer token123",
                    "replace": true
                }
            },
            {
                "name": "activeEditorAddQueryParameter",
                "parameters": {
                    "name": "page",
                    "value": "1" 
                }
            },
            {
                "name": "activeEditorRemoveQueryParameter",
                "parameters": {
                    "name": "page"
                }
            },
            {
                "name": "activeEditorUpdatePath",
                "parameters": {
                    "path": "/api/v2/users"
                }
            },
            {
                "name": "activeEditorRemoveHeader",
                "parameters": {
                    "headerName": "Authorization"
                }
            }
        ]
    }
}

export const tests = {
    ...MatchAndReplaceTests,
    ...ActiveEditorTests
}