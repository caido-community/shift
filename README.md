<div align="center">
  <img width="1000" alt="image" src="https://github.com/caido-community/.github/blob/main/content/banner.png?raw=true">

  <br />
  <br />
  <a href="https://github.com/caido-community" target="_blank">Github</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://developer.caido.io/" target="_blank">Documentation</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://links.caido.io/www-discord" target="_blank">Discord</a>
  <br />
  <hr />
</div>

# Shift

Shift is an AI plugin that integrates state-of-the-art LLMs directly into Caido's UI. It allows for LLM-powered free-form HTTP modification in Replay, automatic contextualization of queries, and [supports many tools that AI can use to interface with Caido. ](https://github.com/CRITSoftware/shift/blob/main/packages/frontend/actionFunctions.txt).


<p align="center">
<img src="https://github.com/user-attachments/assets/0641619d-b629-40c6-9aec-dc209deb8491" width=250>
<p/>

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

## Shift Agents

Shift Agents, the new micro-agent framework for Caido users.

Build personalized micro-agents for tasks like XSS exploitation, WAF bypassing, or anything you can think of.

## Demos
<div>
  <a href="https://www.loom.com/share/ac132e7b4ab645fdaa67c8a34a818fb2">
    <p>Shift Core, Shift Memory, Shift Rename Demo - Watch Video</p>
  </a>
  <a href="https://www.loom.com/share/ac132e7b4ab645fdaa67c8a34a818fb2">
    <img style="max-width:300px;" src="https://cdn.loom.com/sessions/thumbnails/ac132e7b4ab645fdaa67c8a34a818fb2-329aa30b44cf128f-full.jpg">
  </a>
</div>

<hr>

<p>Shift Agents Demo</p>

https://github.com/user-attachments/assets/20853016-cc60-4d49-b4f5-ec7a53eb86e7

<hr />

<p>Shift New Float Demo</p>

https://github.com/user-attachments/assets/88a25f77-3eba-457a-927c-721abb70d759


# Installation

### From Plugin Store

1. Install this plugin via the Caido Plugin Store
2. Press `shift + <space>`

### Manual Installation

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Build the plugin:

   ```bash
   pnpm build
   ```

3. Install in Caido:
   - Upload the `dist/plugin_package.zip` file in Caido by clicking on the "Install Package" button in-app

## Disclosures

Per the [Caido Developer Policy](https://developer.caido.io/policy.html), we are required to inform you that, for this plugin:
* External services are required for full access.
* Server-side telemetry is collected (Opt-in - see [Privacy Policy](https://docs.google.com/document/d/1-x9f1iwsbgQJDIGfyeg3TsR4U_zwexfvdcqqGgbhbIU/edit?usp=sharing))

**External services**

Shift is an AI-powered plugin, so it will be communicating with our backend and SOTA AI models to accomplish the user's intent.
