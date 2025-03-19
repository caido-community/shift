Prompt used to generate queries in testSuite.ts for M&R:
```
Output only JSON. Create an actions array that has a action like the one below for every one of the possibilities from this. Always always always use addMatchAndReplace as the action name, but provide a unique name summarizing the configuration parameters.name. 
For the workflow replacer, specify an ID like "g:1". You must create a action for every combination of section, operation, matcherType, and replacerType possible. Also, include values that match the matcherType and replacerType as the matcher and replacer.
{
  "actions": [
    {
      "name": "addMatchAndReplace",
      "parameters": {
        "name": "testing123",
        "section": "SectionRequestBody",
        "operation": "OperationBodyRaw", 
        "matcherType": "MatcherRawFull",
        "matcher": "",
        "replacerType": "ReplacerTerm",
        "replacer": "abc",
        "query": "req.host.cont:\"rhynorater\"",
        "collectionId": ""
      }
    }
  ]
}

If no matchers are provided, that means that this operation doesn't support matchers. Simply set the matcher and matcherType to null.
If no replacers are provided, that means that this operation doesn't support replacers. Simply set the replacer and replacerType to null.


SectionRequestBody
 - Operations
	- OperationBodyRaw 
        - Matchers
            - MatcherRawRegex
            - MatcherRawValue
            - MatcherRawFull
        - Replacers
            - ReplacerTerm
            - ReplacerWorkflow

SectionResponseBody
 - Operations
	- OperationBodyRaw
        - Matchers
            - MatcherRawRegex
            - MatcherRawValue
            - MatcherRawFull
        - Replacers
            - ReplacerTerm
            - ReplacerWorkflow

SectionRequestFirstLine
 - Operations
	- OperationFirstLineRaw
        - Matchers
            - MatcherRawRegex
            - MatcherRawValue
            - MatcherRawFull
        - Replacers
            - ReplacerTerm
            - ReplacerWorkflow

SectionResponseFirstLine
 - Operations
	- OperationFirstLineRaw
        - Matchers
            - MatcherRawRegex
            - MatcherRawValue
            - MatcherRawFull
        - Replacers
            - ReplacerTerm
            - ReplacerWorkflow

SectionResponseStatusCode
 - Operations
    - OperationStatusCodeUpdate
        - Matchers
        - Replacers
            - ReplacerTerm
            - ReplacerWorkflow


SectionRequestHeader
 - Operations
	- OperationHeaderRaw
        - Matchers
            - MatcherRawRegex
            - MatcherRawValue
            - MatcherRawFull
        - Replacers
            - ReplacerTerm
            - ReplacerWorkflow
	- OperationHeaderUpdate
        - Matchers
            - MatcherName
        - Replacers
            - ReplacerTerm
            - ReplacerWorkflow
	- OperationHeaderAdd
        - Matchers
            - MatcherName
        - Replacers
            - ReplacerTerm
            - ReplacerWorkflow
	- OperationHeaderRemove
        - Matchers
            - MatcherName
        - Replacers

SectionResponseHeader
 - Operations
	- OperationHeaderRaw
        - Matchers
            - MatcherRawRegex
            - MatcherRawValue
            - MatcherRawFull
        - Replacers
            - ReplacerTerm
            - ReplacerWorkflow
	- OperationHeaderUpdate
        - Matchers
            - MatcherName
        - Replacers
            - ReplacerTerm
            - ReplacerWorkflow
	- OperationHeaderAdd
        - Matchers
            - MatcherName
        - Replacers
            - ReplacerTerm
            - ReplacerWorkflow
	- OperationHeaderRemove
        - Matchers
            - MatcherName
        - Replacers

SectionRequestQuery
 - Operations
	- OperationQueryRaw
        - Matchers
            - MatcherRawRegex
            - MatcherRawValue
            - MatcherRawFull
        - Replacers
            - ReplacerTerm
            - ReplacerWorkflow
	- OperationQueryUpdate
        - Matchers
            - MatcherName
        - Replacers
            - ReplacerTerm
            - ReplacerWorkflow
	- OperationQueryAdd
        - Matchers
            - MatcherName
        - Replacers
            - ReplacerTerm
            - ReplacerWorkflow
	- OperationQueryRemove
        - Matchers
            - MatcherName
        - Replacers

SectionRequestMethod
 - Operations
	- OperationMethodUpdate
        - Matchers
        - Replacers
            - ReplacerTerm
            - ReplacerWorkflow

SectionRequestPath
 - Operations
	- OperationPathRaw
        - Matchers
            - MatcherRawRegex
            - MatcherRawValue
            - MatcherRawFull
        - Replacers
            - ReplacerTerm
            - ReplacerWorkflow
```