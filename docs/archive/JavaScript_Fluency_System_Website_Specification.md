# JavaScript Fluency System — Website Specification

## 1. Project Goal

Build a simple web application that helps me continuously revise and learn JavaScript from basic to advanced, with the primary goal of becoming job-ready as a **2-year Full Stack Developer**.

The application must make studying require very little effort to start.

The system should work on:

- Laptop/Desktop
- Mobile
- Any modern browser

The application will be deployed to **Vercel** so the same learning progress can be accessed from both laptop and mobile.

---

## 2. Core Learning Philosophy

The application should follow this learning cycle:

```text
Recall
  ↓
Answer
  ↓
Check
  ↓
Practice
  ↓
Evaluate Understanding
  ↓
Revise Later
```

The user should not be forced to study every topic in depth.

The system should first provide a short revision.

If the user does not understand a topic, the topic can be marked for deeper study.

```text
Topic
  ↓
Quick Revision
  ↓
Do I understand it?
  ├── Yes → Schedule next revision
  ├── Somewhat → Practice
  └── No → Deep Dive
```

---

## 3. Primary Objective

The application should optimize for:

1. JavaScript fluency
2. Practical coding knowledge
3. Full-stack development readiness
4. Interview preparation
5. Consistent daily revision
6. Minimal friction when starting a study session

The application is NOT intended to be a full online course.

It is a **personal revision and practice system**.

---

## 4. Main User Flow

When the user opens the application, they should immediately see:

```text
Today's Revision
```

The user should not need to decide what to study.

Example:

```text
Today's Revision

Topic:
Closures

Estimated time:
10 minutes

[ Start Revision ]
```

Clicking `Start Revision` immediately begins the session.

---

## 5. Study Modes

### 5.1 Commute Mode

Designed for mobile and short periods of time.

Characteristics:

- No coding environment required
- Short questions
- Concept recall
- Output prediction
- Multiple-choice questions
- Short-answer questions
- 5–15 minute sessions

Example:

```text
Topic: Functions

Question:

What is a callback function?

A. A function that calls itself
B. A function passed to another function
C. A function without parameters
D. A function that returns another function
```

The user answers and immediately receives feedback.

### 5.2 Laptop Mode

Designed for deeper practice.

Characteristics:

- Coding questions
- Output prediction
- Small implementation exercises
- Debugging exercises
- Interview questions
- Longer sessions

Example:

```text
Topic: Array Methods

Task:

Create a new array containing only the
even numbers from the following array:

[1, 2, 3, 4, 5, 6]
```

---

## 6. Daily Revision System

Each topic should have a revision schedule.

Initial schedule:

```text
Day 1
Day 3
Day 7
Day 14
Day 30
```

After successful revision, the topic moves to the next interval.

If the user struggles:

```text
Fail / Weak
    ↓
Practice
    ↓
Deep Dive
    ↓
Return to Day 1 revision cycle
```

The system should eventually support configurable intervals.

---

## 7. Topic Status

Every topic has one of three primary statuses.

### Green — Strong

The user can:

- Explain the concept
- Recognize it in code
- Use it
- Answer basic interview questions

Action:

```text
Schedule next revision
```

### Yellow — Needs Practice

The user understands the basic concept but struggles with:

- Coding
- Output prediction
- Explanation
- Practical application

Action:

```text
Add practice
```

### Red — Needs Deep Dive

The user does not understand the concept sufficiently.

Action:

```text
Add to Deep Dive Queue
```

---

## 8. Dashboard

The dashboard is the primary screen.

It should answer:

> What should I do right now?

Example:

```text
--------------------------------
JavaScript Fluency
--------------------------------

Good evening

Today's Progress
██████░░░░ 60%

Today's Revision
--------------------------------

Closures
5 questions
~10 minutes

[ Start ]

--------------------------------

Due Today

✓ Variables
✓ Functions
→ Closures
○ Promises

--------------------------------

Deep Dive Queue

2 topics

Event Loop
Prototype Chain
```

The dashboard should remain simple.

Do not overload it with statistics.

---

## 9. Start Session

The most important interaction should be:

```text
OPEN APP
   ↓
SEE TODAY'S REVISION
   ↓
PRESS START
   ↓
ANSWER QUESTION
```

The user should not need to:

- Search for a topic
- Browse the roadmap
- Decide what to study
- Create a session
- Configure settings

The application should decide the next revision automatically.

---

## 10. Revision Session

A session should look like:

```text
JavaScript
Closures

Question 1 / 5

What is a closure?

[ Answer ]

[ Check Answer ]
```

After answering:

```text
Correct

Short explanation:
...

Confidence

[ Easy ] [ Okay ] [ Difficult ]

[ Next ]
```

The application should then continue to the next question.

---

## 11. Confidence Tracking

After a question, allow the user to indicate confidence:

```text
Easy
Okay
Difficult
Didn't understand
```

This should influence topic status.

For example:

```text
Mostly Easy
→ Green

Mixed
→ Yellow

Mostly Difficult
→ Red
```

The exact algorithm can be implemented later.

---

## 12. Deep Dive Queue

The application should have a dedicated section:

```text
Deep Dive
```

Example:

```text
Topics requiring deeper study

1. Event Loop
   Reason: Cannot explain microtasks

2. Closures
   Reason: Understands definition but
           struggles with practical usage

3. Prototype Chain
   Reason: Cannot explain inheritance
```

The user should be able to open a topic and record their own notes/resources.

---

## 13. JavaScript Roadmap

The initial roadmap should contain:

### Fundamentals

```text
Variables
Data Types
Operators
Type Coercion
Equality
Conditionals
Loops
Functions
Scope
Hoisting
```

### Core JavaScript

```text
Arrays
Objects
Strings
Destructuring
Spread
Rest
Callbacks
Higher-Order Functions
Array Methods
Object Methods
this
Arrow Functions
Closures
Modules
Error Handling
```

### Asynchronous JavaScript

```text
Synchronous vs Asynchronous
Call Stack
Event Loop
Web APIs
Microtasks
Macrotasks
Promises
async / await
Promise.all
Promise.allSettled
Promise.race
Promise.any
Fetch
```

### Advanced JavaScript

```text
Execution Context
Lexical Environment
Prototype
Prototype Chain
Classes
Inheritance
Iterators
Generators
Map
Set
WeakMap
WeakSet
Memory Management
Garbage Collection
```

---

## 14. Full-Stack Learning Areas

JavaScript is the primary learning area, but the application should eventually support:

```text
JavaScript
TypeScript
Angular
Node.js
Express
Database
REST / HTTP
Git
Testing
RxJS
NgRx
System / Application Design
Problem Solving
Interview Preparation
```

Each area should use the same revision system.

---

## 15. Mistake Log

The application should maintain a mistake log.

Example:

```text
Mistake Log

Topic:
Promise.all

Mistake:
I thought Promise.all returns successful
promises even when one promise rejects.

Correct understanding:
Promise.all rejects when any input promise rejects.
```

The system should be able to turn mistakes into future revision questions.

---

## 16. Practice System

Practice should be separate from simple revision.

Practice categories:

```text
Concept
Output Prediction
Code Writing
Debugging
Problem Solving
Interview Question
Real-World Usage
```

Example:

```text
Topic: Closures

Concept:
Explain closure.

Output:
Predict the output.

Code:
Write a counter using closure.

Real-world:
Where might closures appear in an application?
```

---

## 17. Mobile Requirements

The application must be mobile-first.

Requirements:

- Responsive layout
- Large touch targets
- Minimal navigation
- Fast loading
- Readable code
- No horizontal scrolling
- Dark/light theme support
- Session should work comfortably with one hand

The mobile experience should prioritize:

```text
Today's Revision
Questions
Progress
Deep Dive
```

---

## 18. Laptop Requirements

On larger screens:

- Use available screen space
- Show question and explanation clearly
- Provide better code presentation
- Allow longer practice sessions
- Show dashboard statistics
- Provide roadmap navigation

The same account/data should be available on mobile and laptop.

---

## 19. Data Synchronization

The application will eventually need persistent user data.

The data should include:

```text
User
Topics
Questions
Revision History
Topic Status
Confidence
Mistakes
Deep Dive Topics
Practice History
Daily Progress
```

The architecture should allow the user to switch between:

```text
Laptop
   ↕
Cloud Data
   ↕
Mobile
```

and continue from the same state.

---

## 20. Deployment

Initial deployment target:

**Vercel**

Requirements:

- Production deployment through Vercel
- HTTPS
- Mobile accessible URL
- Responsive web application
- Environment variables handled securely
- Production and development environments separated

The architecture should avoid unnecessary infrastructure during the initial version.

---

## 21. MVP

The first version should be intentionally small.

### MVP must include:

```text
1. Dashboard

2. JavaScript roadmap

3. Topic list

4. Topic details

5. Daily revision

6. Question/answer flow

7. Confidence selection

8. Topic status

9. Revision scheduling

10. Deep Dive queue

11. Mistake log

12. Responsive mobile + desktop UI
```

### Do NOT build initially:

```text
Social features
Leaderboards
Gamification
Complex analytics
AI-generated curriculum
Community features
Subscriptions
Notifications
```

These can be considered later.

---

## 22. Design Principle

The application should follow one major principle:

> **Reduce the effort required to start learning.**

The user should be able to open the application and start studying within seconds.

The ideal flow is:

```text
Open
 ↓
Today's Topic
 ↓
Start
 ↓
Answer
 ↓
Next
 ↓
Finish
```

Not:

```text
Open
 ↓
Choose subject
 ↓
Choose level
 ↓
Choose topic
 ↓
Choose lesson
 ↓
Choose difficulty
 ↓
Configure session
 ↓
Start
```

---

## 23. Future AI Integration

AI can be added later to assist with:

- Generating revision questions
- Explaining difficult concepts
- Creating deeper explanations
- Generating practice problems
- Analyzing mistakes
- Creating interview questions
- Adjusting difficulty
- Identifying weak topics

However, the core learning system must work without AI.

AI should enhance the system, not be required for its basic operation.

---

## 24. Success Criteria

The website is successful if:

1. I can open it and start studying immediately.
2. I can use it during a 5–10 minute commute.
3. I can continue the same learning session from my laptop.
4. I don't need to decide what to study.
5. Weak topics automatically receive more attention.
6. Strong topics are automatically scheduled for later revision.
7. I can see what I need to revise today.
8. I can track mistakes.
9. I can gradually progress from JavaScript fundamentals to advanced concepts.
10. The system supports my larger goal of becoming job-ready as a 2-year Full Stack Developer.

---

## 25. Initial Technical Direction

The technology stack should be kept simple.

Recommended initial stack:

```text
Frontend:
Angular

Language:
TypeScript

Styling:
SCSS / CSS

Hosting:
Vercel

Version Control:
Git / GitHub
```

The backend/database architecture should be selected during the implementation phase based on the MVP requirements.

Do not introduce unnecessary infrastructure before the core learning experience is working.

---

## 26. Development Principle

Build the application incrementally.

```text
Phase 1
↓
Static learning dashboard

Phase 2
↓
Topics + questions

Phase 3
↓
Revision scheduling

Phase 4
↓
Progress + mistakes

Phase 5
↓
Persistent cloud data

Phase 6
↓
Mobile optimization

Phase 7
↓
AI assistance
```

Each phase should produce a usable application.

The first goal is not to build a sophisticated learning platform.

The first goal is to build a **frictionless personal JavaScript revision tool that I will actually use every day**.
