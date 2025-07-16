<p align="center">
<img src="https://github.com/user-attachments/assets/0641619d-b629-40c6-9aec-dc209deb8491" width=250>
<p/>

# Shift AI Plugin

Shift is an AI plugin that integrates state-of-the-art LLMs directly into Caido's UI. It allows for LLM-powered free-form HTTP modification in Replay, automatic contextualization of queries, and [supports many tools that AI can use to interface with Caido. ](https://github.com/CRITSoftware/shift/blob/main/packages/frontend/actionFunctions.txt).

Use Cases include:
* `Build out this JSON request body in Replay [Paste Obfuscated JS Code]`
    * **Result**: AI automatically builds the JSON request body from the JS code.
* `Match and Replace this to true` (with a feature flag boolean selected) 
    * **Result**: AI creates Match & Replace rule to turn on the feature
* `Add this to scope` 
    * **Result**: AI adds the current request to scope
* `Generate a wordlist with all HTTP Verbs` 
    * **Result**: AI generates a wordlist with all HTTP verbs and adds it to your hosted files
* `Capitalize the 2nd letter of all query parameters` 
    * **Result**: AI uses a Replay search and replace tool to capitalize all 2nd letters of query params
* `Remove all the spaces from the path` 
    * **Result**: AI updates the path to reflect the same path but without spaces
* `Add 3 more tags to the JSON request body` 
    * **Result**: AI reads the current JSON body and adds 3 more tag objects to the "tags" array.

## Demo
<div>
    <a href="https://www.loom.com/share/ac132e7b4ab645fdaa67c8a34a818fb2">
      <p>Shift Core, Shift Memory, Shift Rename Demo - Watch Video</p>
    </a>
    <a href="https://www.loom.com/share/ac132e7b4ab645fdaa67c8a34a818fb2">
      <img style="max-width:300px;" src="https://cdn.loom.com/sessions/thumbnails/ac132e7b4ab645fdaa67c8a34a818fb2-329aa30b44cf128f-full.jpg">
    </a>
  </div>

## Usage

1. Install this plugin via the Caido Plugin Store
2. Press `shift + <space>`

## Disclosures

Per the [Caido Developer Policy](https://developer.caido.io/policy.html), we are required to inform you that, for this plugin:
* External services are required for full access.
* Server-side telemetry is collected (Opt-in - see [Privacy Policy](https://docs.google.com/document/d/1-x9f1iwsbgQJDIGfyeg3TsR4U_zwexfvdcqqGgbhbIU/edit?usp=sharing))

**External services**

Shift is an AI-powered plugin, so it will be communicating with our backend and SOTA AI models to accomplish the user's intent.
