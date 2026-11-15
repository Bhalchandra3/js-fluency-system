/**
 * Phase 7 Step 2 — convert REVISION SHORT_ANSWER → MULTIPLE_CHOICE in questions.json.
 * Run: node scripts/phase7-c1-convert-sa-to-mcq.mjs
 * Does not seed the database.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const questionsPath = path.join(root, 'prisma', 'seed-data', 'questions.json');

/** @type {Record<string, { options: string[]; correctAnswer: string; prompt?: string }>} */
const byTopicSlug = {
  variables: {
    options: [
      'The period from entering the scope until the declaration is initialized, during which accessing the binding throws a ReferenceError',
      'The time after the script ends when unused variables are deleted',
      'Only the moment before the whole program starts, when no bindings exist yet',
      'A browser-only pause while the garbage collector runs',
    ],
    correctAnswer: '0',
  },
  'data-types': {
    options: [
      'string, number, bigint, boolean, undefined, symbol, null',
      'string, number, boolean, object, function, undefined, null',
      'string, number, boolean, array, object, undefined, null',
      'string, int, float, boolean, undefined, symbol, null',
    ],
    correctAnswer: '0',
  },
  operators: {
    options: [
      '2.5 (a floating-point number)',
      '2 (integer division truncates)',
      '2 with a remainder of 1 as a separate value',
      'NaN because mixed integer/float division is invalid',
    ],
    correctAnswer: '0',
  },
  'type-coercion': {
    options: ['"null"', '"" (empty string)', '"undefined"', '"Null"'],
    correctAnswer: '0',
  },
  equality: {
    options: [
      'Object.is (Object.is(NaN, NaN))',
      'Number.isNaN alone comparing two values with ===',
      'Array.prototype.includes cannot help with NaN',
      'parseFloat(NaN) === parseFloat(NaN)',
    ],
    correctAnswer: '0',
  },
  conditionals: {
    options: [
      'b (the expression after the colon)',
      'a (the expression after the question mark)',
      'condition itself',
      'undefined always',
    ],
    correctAnswer: '0',
  },
  loops: {
    options: [
      'Skips the rest of the current iteration and proceeds to the next iteration (after running the loop update in a classic for)',
      'Exits the entire loop immediately, like break',
      'Restarts the program from the first statement',
      'Pauses the loop until a Promise resolves',
    ],
    correctAnswer: '0',
  },
  functions: {
    options: [
      'Wrap the object in parentheses, e.g. () => ({ a: 1 })',
      'Use return without parentheses: () => return { a: 1 }',
      'Use a bare block: () => { a: 1 }',
      'Use new Object inside the arrow without parentheses',
    ],
    correctAnswer: '0',
  },
  scope: {
    options: [
      'A function resolves free variables from the scope where it was defined, not where it is called',
      'A function resolves free variables from the call site only',
      'All variables are global unless marked private',
      'Scope is determined solely by the this binding at runtime',
    ],
    correctAnswer: '0',
  },
  hoisting: {
    options: [
      'No — the const binding is in the TDZ until initialized, so calling f early throws ReferenceError',
      'Yes — function expressions assigned to const are fully hoisted like declarations',
      'Yes — only if the file uses "use strict"',
      'No — it returns undefined silently without throwing',
    ],
    correctAnswer: '0',
  },
  arrays: {
    options: [
      'No — holes are missing indexes; undefined is a real stored value at that index',
      'Yes — holes and undefined entries are identical in every way',
      'Yes — both always make hasOwnProperty return true',
      'No — holes store null while undefined stores undefined',
    ],
    correctAnswer: '0',
  },
  objects: {
    options: [
      'For a fixed identifier name like key they read the same property; brackets are required for dynamic or non-identifier names',
      'Dot notation always boxes the key as a Symbol',
      'Bracket notation can only access inherited properties',
      'obj.key reads a different property than obj["key"] for the name key',
    ],
    correctAnswer: '0',
  },
  strings: {
    options: [
      'true — every string is considered to include the empty substring',
      'false — the empty string is never a substring',
      'true only for non-empty receiver strings',
      'It throws a TypeError',
    ],
    correctAnswer: '0',
  },
  destructuring: {
    options: [
      'Destructuring requires a coercible object; null/undefined throw, while {} is valid and missing a yields undefined',
      'Both throw because a is missing',
      'null is treated as {} automatically',
      'Only arrays can be destructured, so both throw',
    ],
    correctAnswer: '0',
  },
  spread: {
    options: [
      'The later spread wins because properties are copied left to right and later keys overwrite earlier ones',
      'The earlier spread wins and later duplicates are ignored',
      'Duplicate keys always throw TypeError',
      'Neither key is kept when duplicates exist',
    ],
    correctAnswer: '0',
  },
  rest: {
    options: [
      'No — rest must be last because it collects all remaining arguments',
      'Yes — rest can appear anywhere and still collect leftovers',
      'Yes — rest must be first to collect early arguments',
      'Rest parameters are only allowed in arrow functions',
    ],
    correctAnswer: '0',
  },
  callbacks: {
    options: [
      'The continuation never runs, so later work that depends on the callback never executes',
      'JavaScript automatically retries the callback every frame',
      'The event loop deletes the callback reference and finishes the program',
      'Forgetting () still invokes the function as a method',
    ],
    correctAnswer: '0',
  },
  'higher-order-functions': {
    options: [
      'Yes — it accepts a predicate function as an argument and calls it for each element',
      'No — only functions that return functions are higher-order',
      'No — Array methods are never higher-order',
      'Yes — but only when used with async predicates',
    ],
    correctAnswer: '0',
  },
  'array-methods': {
    options: ['undefined', 'null', '[]', 'false'],
    correctAnswer: '0',
  },
  'object-methods': {
    options: [
      'Yes it prevents adds; in non-strict mode the assignment fails silently, in strict mode it throws',
      'No — freeze only makes existing properties non-enumerable',
      'Yes — and non-strict mode always throws TypeError on failed adds',
      'No — freeze only affects the prototype chain',
    ],
    correctAnswer: '0',
  },
  'this-keyword': {
    options: [
      'call takes arguments individually; apply takes them as an array (or array-like). Both set this to the first argument',
      'apply takes arguments individually; call takes an array',
      'call cannot set this; apply can',
      'They are identical aliases with no difference',
    ],
    correctAnswer: '0',
  },
  'arrow-functions': {
    options: [
      'Because this is lexical and will not refer to the object when the method is called',
      'Because arrows cannot be stored as object properties',
      'Because arrows always bind this to the global object on purpose',
      'Because arrows reject any use of return',
    ],
    correctAnswer: '0',
  },
  closures: {
    options: [
      'var is function-scoped, so all callbacks share one i that is 3 after the loop ends',
      'setTimeout coerces i to the string "3" for every callback',
      'The loop runs backwards from 3 to 0',
      'Each timeout gets a private copy of i that is still 3 by coincidence only',
    ],
    correctAnswer: '0',
  },
  modules: {
    options: [
      'Yes',
      'No',
      'Only when the file starts with "use strict"',
      'Only in CommonJS, not ESM',
    ],
    correctAnswer: '0',
  },
  'error-handling': {
    options: [
      'Yes — finally runs on the way out whether try completes, throws, or returns',
      'No — finally runs only when an error is thrown',
      'No — a return in try skips finally',
      'Yes — but only in strict mode',
    ],
    correctAnswer: '0',
  },
  'sync-vs-async': {
    options: [
      'It occupies the call stack continuously, so the event loop cannot process UI events, timers, or other callbacks until the loop finishes',
      'The browser pauses all network activity until the loop ends',
      'Synchronous loops are moved to a worker automatically and freeze the UI thread',
      'The garbage collector locks the page for the duration of any loop',
    ],
    correctAnswer: '0',
  },
  'call-stack': {
    options: [
      'RangeError: Maximum call stack size exceeded',
      'TypeError: Cannot read properties of undefined',
      'SyntaxError: Unexpected end of input',
      'URIError: URI malformed',
    ],
    correctAnswer: '0',
  },
  'event-loop': {
    options: [
      'Call stack, microtask queue (job queue), and task/macrotask queue — coordinated by the event loop',
      'Only the heap and the garbage collector',
      'Only localStorage and sessionStorage',
      'Only the CSSOM and the render tree',
    ],
    correctAnswer: '0',
  },
  'web-apis': {
    options: [
      'Host/Web API (browser or other host), not part of the ECMAScript language specification itself',
      'Part of the ECMAScript language core since ES5',
      'A CSS feature exposed to JavaScript',
      'Only available inside WebAssembly modules',
    ],
    correctAnswer: '0',
  },
  microtasks: {
    options: [
      'The event loop drains the entire microtask queue before the next macrotask; continuously enqueueing new microtasks never lets macrotasks (timers, paint) run',
      'Timers have lower priority than network I/O only',
      'Microtasks run at most once per page load',
      'Browsers cancel timers when any Promise is created',
    ],
    correctAnswer: '0',
  },
  macrotasks: {
    options: [
      'Immediately after that first macrotask finishes (microtask checkpoint), before the second setTimeout macrotask starts',
      'Only after both setTimeout callbacks have finished',
      'Only on the next animation frame',
      'Never — microtasks from a timer wait until the page unloads',
    ],
    correctAnswer: '0',
  },
  promises: {
    options: [
      'No — a promise settles at most once; later resolve/reject calls are ignored',
      'Yes — the second resolve replaces the fulfillment value',
      'Yes — but only if both values are primitives',
      'No — the second resolve throws TypeError',
    ],
    correctAnswer: '0',
  },
  'async-await': {
    options: [
      'Wrap the await in try/catch (or let the async function reject and handle that promise with .catch)',
      'Use a second await on the rejection channel only',
      'Pass a second callback argument to await',
      'Rejection cannot be caught inside async functions',
    ],
    correctAnswer: '0',
  },
  'promise-all': {
    options: [
      'No — it rejects as soon as the first rejection happens (other promises may still settle independently)',
      'Yes — it always waits for all ten before rejecting',
      'Yes — it converts rejections into null and waits',
      'No — it cancels the other nine automatically',
    ],
    correctAnswer: '0',
  },
  'promise-race': {
    options: [
      'No — other promises continue unless you implement cancellation separately (e.g. AbortController for fetch)',
      'Yes — losers are aborted by the engine automatically',
      'Yes — losers are converted to never-settling promises',
      'No — race freezes losers until the winner settles, then cancels them',
    ],
    correctAnswer: '0',
  },
  'promise-any': {
    options: [
      'race adopts the first settlement (so a fast rejection wins); any ignores rejections until a fulfillment (or AggregateError if all reject)',
      'any and race are identical for rejections and fulfillments',
      'any always waits for every promise before settling',
      'race ignores fulfillments until all reject',
    ],
    correctAnswer: '0',
  },
  'execution-context': {
    options: [
      'Variable/Lexical Environment, outer lexical environment reference (scope chain), and this binding',
      'Only the call stack pointer and the heap address',
      'Only import maps and the module cache',
      'Only the prototype chain and Symbol.iterator',
    ],
    correctAnswer: '0',
  },
  'lexical-environment': {
    options: [
      'Look up the identifier in the current Environment Record, then follow the outer reference until found or the chain ends',
      'Always start lookup from the global object first',
      'Resolve identifiers only from the call stack top frame’s this value',
      'Skip outer environments when the identifier starts with _',
    ],
    correctAnswer: '0',
  },
  prototype: {
    options: [
      'Object.getPrototypeOf(obj) is the instance [[Prototype]]; Constructor.prototype is what becomes [[Prototype]] for new instances',
      'They are always the same object reference',
      'Constructor.prototype is the instance’s own [[Prototype]] only after freeze',
      'obj.__proto__ stores static methods; .prototype stores instance fields',
    ],
    correctAnswer: '0',
  },
  'prototype-chain': {
    options: [
      'Object.prototype, then null',
      'Function.prototype, then null',
      'null immediately with no Object.prototype',
      'Array.prototype, then Object.prototype, then null',
    ],
    correctAnswer: '0',
  },
  classes: {
    options: [
      'Class declarations are in the TDZ like let; using the class before initialization throws ReferenceError',
      'Classes hoist fully like function declarations and can be used earlier',
      'Classes are not hoisted at all and create a global undefined binding',
      'Using a class early returns null instead of throwing',
    ],
    correctAnswer: '0',
  },
  inheritance: {
    options: [
      'super() must be called before accessing this in the derived constructor',
      'this may be used freely before super()',
      'super() is optional when the subclass has no fields',
      'super() must be called after returning from the constructor',
    ],
    correctAnswer: '0',
  },
  iterators: {
    options: [
      'An IteratorResult object: { value, done } where done is a boolean',
      'A bare value with no wrapper object',
      'A Promise that always fulfills with the next item',
      'A two-element array [value, done]',
    ],
    correctAnswer: '0',
  },
  generators: {
    options: [
      'yield pauses and produces a value to the caller; the argument to the next next(value) becomes the result of that yield expression',
      'yield schedules a macrotask; next(value) ignores value',
      'yield is identical to return and ends the generator',
      'next(value) replaces the generator function source code',
    ],
    correctAnswer: '0',
  },
  map: {
    options: [
      'Map keeps object keys by identity; plain object keys are strings/symbols (objects coerce to "[object Object]")',
      'Map stringifies object keys the same way plain objects do',
      'Plain objects support object keys natively without coercion',
      'Map forbids object keys and only allows strings',
    ],
    correctAnswer: '0',
  },
  set: {
    options: [
      '1, because Set uses SameValueZero, under which NaN equals NaN',
      '2, because NaN !== NaN so both entries are kept',
      '0, because NaN is not allowed in Set',
      '1 only in strict mode; otherwise 2',
    ],
    correctAnswer: '0',
  },
  weakmap: {
    options: [
      'Keys are held weakly, so the entry set is GC-dependent; enumeration/size would be unreliable, so the API omits them',
      'WeakMap is iterable but size is hidden for security',
      'WeakMap stores only primitives, so size is meaningless',
      'Browsers deprecate iteration on all map-like collections',
    ],
    correctAnswer: '0',
  },
  weakset: {
    options: [
      'Marking objects as seen/visited without preventing garbage collection',
      'Storing large strings more efficiently than Set',
      'Guaranteeing insertion order for primitive numbers',
      'Replacing arrays for stack algorithms',
    ],
    correctAnswer: '0',
  },
  'memory-management': {
    options: [
      'A long-lived function may close over variables that reference large objects, keeping them reachable',
      'Closures always copy object graphs by value, doubling memory',
      'The engine disables GC while any closure exists',
      'Closures move captured variables into localStorage automatically',
    ],
    correctAnswer: '0',
  },
  'garbage-collection': {
    options: [
      'Reachability-based collectors (e.g. mark-and-sweep) reclaim cycles not reachable from roots; pure reference counting would fail on cycles',
      'Engines never collect cycles; programmers must break them manually always',
      'Cycles are stored on disk until reboot',
      'Reference counting alone collects all cycles automatically',
    ],
    correctAnswer: '0',
  },
};

function validateMcq(question, label) {
  if (question.format !== 'MULTIPLE_CHOICE') {
    throw new Error(`${label}: expected MULTIPLE_CHOICE`);
  }
  if (!Array.isArray(question.options) || question.options.length < 2) {
    throw new Error(`${label}: options must be string array length >= 2`);
  }
  if (!question.options.every((o) => typeof o === 'string')) {
    throw new Error(`${label}: options must be strings`);
  }
  const index = Number(question.correctAnswer);
  if (
    !Number.isInteger(index) ||
    String(index) !== question.correctAnswer ||
    index < 0 ||
    index >= question.options.length
  ) {
    throw new Error(`${label}: invalid correctAnswer index`);
  }
}

const raw = fs.readFileSync(questionsPath, 'utf8');
const questions = JSON.parse(raw);

let converted = 0;
const missing = [];
const seen = new Set();

for (const question of questions) {
  if (question.sessionType !== 'REVISION' || question.format !== 'SHORT_ANSWER') {
    continue;
  }
  const slug = question.topicSlug;
  const spec = byTopicSlug[slug];
  if (!spec) {
    missing.push(slug);
    continue;
  }
  if (seen.has(slug)) {
    throw new Error(`Duplicate REVISION SHORT_ANSWER for topicSlug=${slug}`);
  }
  seen.add(slug);

  question.format = 'MULTIPLE_CHOICE';
  question.options = spec.options;
  question.correctAnswer = spec.correctAnswer;
  if (spec.prompt) {
    question.prompt = spec.prompt;
  }
  validateMcq(question, slug);
  converted += 1;
}

if (missing.length > 0) {
  throw new Error(`Missing conversions for: ${missing.join(', ')}`);
}

const expectedSlugs = Object.keys(byTopicSlug);
if (converted !== expectedSlugs.length) {
  throw new Error(
    `Converted ${converted} but expected ${expectedSlugs.length}. Missing topics in bank: ${expectedSlugs
      .filter((s) => !seen.has(s))
      .join(', ')}`,
  );
}

const remainingSa = questions.filter(
  (q) => q.sessionType === 'REVISION' && q.format === 'SHORT_ANSWER',
);
if (remainingSa.length !== 0) {
  throw new Error(`Still have ${remainingSa.length} REVISION SHORT_ANSWER rows`);
}

const revisionMcq = questions.filter(
  (q) => q.sessionType === 'REVISION' && q.format === 'MULTIPLE_CHOICE',
).length;

fs.writeFileSync(questionsPath, `${JSON.stringify(questions, null, 2)}\n`, 'utf8');
console.log(
  JSON.stringify(
    {
      converted,
      revisionMultipleChoice: revisionMcq,
      revisionShortAnswerRemaining: remainingSa.length,
      path: path.relative(root, questionsPath),
    },
    null,
    2,
  ),
);
