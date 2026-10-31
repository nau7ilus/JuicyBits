import {createHash} from 'node:crypto';
export const sha256=text=>createHash('sha256').update(text,'utf8').digest('hex');
// Input schema permits one string field. JSON.stringify is canonical for this fixed shape.
export const inputHash=(input,nonce)=>sha256(`${nonce};${JSON.stringify({prompt:input.prompt})}`);
// Purchaser formula, not the raw MIP-004 text: Sokosumi hashResult and pip-masumi create_masumi_output_hash
// hash the JSON-escaped result without its quotes. A raw hash shows as "not verified" for multi-line reports.
export const resultHash=(result,nonce)=>sha256(`${nonce};${JSON.stringify(result).slice(1,-1)}`);
