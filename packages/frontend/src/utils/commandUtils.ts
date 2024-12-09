import logger from "./logger";

export function parsePayloads(payloads: Array<any>): Array<{options: any}> {
  let output = payloads.map(payload => {
    // Case 1: {start: number, end: number} -> number range payload
    if ('start' in payload && 'end' in payload) {
      return {
        options: {
          number: {
            range: {
              start: payload.start,
              end: payload.end
            }
          }
        }
      };
    }
    
    // Case 2: {id: string} -> hosted file payload
    if ('id' in payload) {
      return {
        options: {
          hostedFile: {
            id: payload.id
          }
        }
      };
    }
    
    // Case 3: Array<string> -> simple list payload
    if (Array.isArray(payload)) {
      return {
        options: {
          simpleList: {
            list: payload
          }
        }
      };
    }

    throw new Error('Invalid payload format. Must be either {start, end}, {id}, or string[]');
  });
  output = output.map((d) => {
    return {
      ...d,
      preprocessors: [{
      options: {
        urlEncode: {
          charset: ":/\\?#[]{}@$&+ ,;=%<>",
          nonAscii: true
        }
        }
      }]
    };
  });
  logger.log("output", output);
  return output;
}