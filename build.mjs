import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';
import pdf from './pdf-bank.mjs';
import photos from './photo-bank.mjs';
import {screenshots, a5t} from './screenshot-bank.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const read = p => readFileSync(join(here,p),'utf8');
const sets = [
  {id:'pdf', label:'Practice PDF', questions:pdf},
  {id:'photo', label:'Endterm photos', questions:photos},
  {id:'screen', label:'Endterm screenshots', questions:screenshots},
  {id:'a5t', label:'A5T screenshots', questions:a5t}
];
const figures = {};
const ids = new Set();
for (const s of sets) for (const q of s.questions) {
  assert(!ids.has(q.id)); ids.add(q.id);
  assert(q.stem && q.why && q.topic);
  assert(q.choices.length >= 2 && new Set(q.choices).size === q.choices.length);
  for (const n of [].concat(q.correct)) assert(Number.isInteger(n) && n >= 0 && n < q.choices.length);
  if (q.figure) {
    assert(q.alt);
    figures[q.figure] = 'data:image/png;base64,' + readFileSync(join(here,'figures',q.figure)).toString('base64');
  }
  if (q.table) assert(q.table.every(row => row.length === q.table[0].length));
}
const html = read('template.html')
  .replace('/*STYLE*/',()=>read('style.css'))
  .replace('/*DATA*/',()=>`const quizData = ${JSON.stringify({sets, figures}).replaceAll('<','\\u003c')};`)
  .replace('/*APP*/',()=>read('app.js'));
const target = process.argv[2] === 'docs' ? 'docs' : 'dist';
mkdirSync(join(here,target),{recursive:true});
writeFileSync(join(here,target,'index.html'),html);
console.log(`Built ${ids.size} questions, ${sets.length} sets and ${Object.keys(figures).length} figures`);
