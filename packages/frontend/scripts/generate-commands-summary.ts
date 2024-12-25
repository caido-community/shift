import ts from 'typescript';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function isJsonCompatibleType(type: ts.TypeNode): boolean {
    if (ts.isFunctionTypeNode(type)) return false;
    if (ts.isTypeReferenceNode(type)) {
        const typeName = type.typeName.getText();
        // Add other non-JSON compatible types here if needed
        if (typeName === 'Promise' || typeName === 'Function') return false;
    }
    return true;
}

function generateCommandsSummary(filePath: string): string {
    try {
        const fileContent = readFileSync(filePath, 'utf-8');
        const sourceFile = ts.createSourceFile(
            'commands.ts',
            fileContent,
            ts.ScriptTarget.Latest,
            true
        );

        let output = '';
        function processNode(node: ts.Node) {
            if (ts.isVariableStatement(node)) {
                const declaration = node.declarationList.declarations[0];
                if (
                    ts.isIdentifier(declaration.name) &&
                    declaration.name.text === 'actionFunctions' &&
                    declaration.initializer &&
                    ts.isObjectLiteralExpression(declaration.initializer)
                ) {
                    declaration.initializer.properties.forEach((prop, index) => {
                        if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
                            const functionName = prop.name.text;
                            if (ts.isArrowFunction(prop.initializer)) {
                                const params = prop.initializer.parameters;
                                // Skip the first parameter (caido)
                                const relevantParams = params.slice(1);
                                
                                // Get any comments above the property
                                const isDeprecated = fileContent
                                    .slice(prop.pos - 10, prop.pos+20)
                                    .includes('DEPRECATED');

                                output += `  ${functionName}: `;
                                
                                if (relevantParams.length === 0) {
                                    output += '{} // No parameters';
                                } else {
                                    relevantParams.forEach(param => {
                                        if (param.type && ts.isTypeLiteralNode(param.type)) {
                                            const paramTypes = param.type.members
                                                .map(member => {
                                                    if (ts.isPropertySignature(member) && member.type) {
                                                        // Skip non-JSON compatible types
                                                        if (!isJsonCompatibleType(member.type)) {
                                                            return '';
                                                        }
                                                        
                                                        const name = (member.name as ts.Identifier).text;
                                                        const optional = member.questionToken ? '?' : '';
                                                        let type = '';
                                                        
                                                        if (ts.isTypeReferenceNode(member.type)) {
                                                            type = member.type.typeName.getText();
                                                        } else {
                                                            type = member.type.getText();
                                                        }
                                                        
                                                        return `${name}${optional}: ${type}`;
                                                    }
                                                    return '';
                                                })
                                                .filter(Boolean)
                                                .join(', ');
                                            
                                            if (paramTypes) {
                                                output += `{ ${paramTypes} }`;
                                            } else {
                                                output += '{} // No JSON-compatible parameters';
                                            }
                                        } else if (param.type && isJsonCompatibleType(param.type)) {
                                            output += param.type.getText();
                                        } else {
                                            output += '{} // Non-JSON compatible type';
                                        }
                                    });
                                }

                                if (isDeprecated) {
                                    output += ' // DEPRECATED';
                                }
                                
                                if (index < (declaration.initializer as ts.ObjectLiteralExpression).properties.length - 1) {
                                    output += '\n';
                                }
                            }
                        }
                    });
                }
            }
            ts.forEachChild(node, processNode);
        }

        processNode(sourceFile);
        return output;
    } catch (error) {
        console.error('Error generating commands summary:', error);
        process.exit(1);
    }
}

try {
    // Get the path to commands.ts relative to this script
    const commandsPath = resolve(__dirname, '../src/commands.ts');
    const outputPath = resolve(__dirname, '../actionFunctions.txt');

    // Generate and write the summary to file
    const summary = generateCommandsSummary(commandsPath);
    writeFileSync(outputPath, summary, 'utf-8');
    console.log(`Commands summary written to ${outputPath}`);
} catch (error) {
    console.error('Error running script:', error);
    process.exit(1);
} 