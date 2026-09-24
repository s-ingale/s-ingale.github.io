---
title: "Why AI Agents Need Context Management"
description: "Start with a stateless model call, then build the agent loop, tool use, and memory layers from first principles."
date: 2026-09-24
---

<style>
.agent-steps{margin:2rem 0;padding:1.25rem;border:1px solid #ced9e4;border-radius:14px;background:#f7fafc;color:#263544}
.agent-steps *{box-sizing:border-box}.agent-steps h2{font-size:1.2rem;margin:0 0 .4rem}.agent-steps p{margin:.35rem 0 1rem}
.agent-steps input{position:absolute;opacity:0}.agent-steps .tabs{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem}
.agent-steps label{cursor:pointer;padding:.4rem .8rem;border:1px solid #9babbc;border-radius:999px;font-size:.85rem}
#step-1:checked~.tabs label[for=step-1],#step-2:checked~.tabs label[for=step-2],#step-3:checked~.tabs label[for=step-3],#step-4:checked~.tabs label[for=step-4]{background:#344d6b;color:white}
.agent-steps .scene{display:none;grid-template-columns:1fr auto 1fr;align-items:center;gap:.7rem;animation:step-in .3s ease}
#step-1:checked~.scenes .scene-1,#step-2:checked~.scenes .scene-2,#step-3:checked~.scenes .scene-3,#step-4:checked~.scenes .scene-4{display:grid}
.agent-steps .box{min-height:130px;padding:.8rem;background:white;border:1px solid #ced9e4;border-radius:10px}
.agent-steps .box strong{display:block;margin-bottom:.5rem}.agent-steps .chip{display:block;margin:.25rem 0;padding:.3rem .5rem;border-radius:6px;background:#e7edf5;font-size:.8rem}
.agent-steps .fresh{background:#ddf1e9}.agent-steps .summary{background:#ffe5cc}.agent-steps .arrow{font-size:1.5rem}.agent-steps .caption{margin:.85rem 0 0;font-size:.82rem}
@keyframes step-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:600px){.agent-steps .scene{grid-template-columns:1fr}.agent-steps .arrow{text-align:center;transform:rotate(90deg)}}
@media(prefers-reduced-motion:reduce){.agent-steps .scene{animation:none}}
</style>

An LLM receives an input and produces an output. Call it again with only a new question, and it has no built-in record of the previous call. This is what we mean when we say it is **stateless**: continuity has to be supplied in the next input.

That simple fact explains a surprising amount of how AI agents work. If we want a model to hold a conversation, use tools, or finish a task that takes many steps, something outside the model must keep track of what happened. That surrounding software is often called a **harness**.

## Start with the simplest possible call

Imagine the model receives: “What is 2 + 2?” It responds: “4.” Now you call it again with: “Why?” With no earlier message attached, “Why?” has no clear subject.

A chat application solves this by sending both messages in the next request. The model sees “What is 2 + 2?”, its answer, and “Why?” together. It can now respond sensibly. The application created the appearance of memory by **rebuilding context** for each call.

But there is a limit: every model has a finite **context window**, the amount of input it can consider in one request. Sending the entire history forever cannot work. We will need a way to choose what belongs in the next request.

## From a chat to an agent

Suppose you ask: “Find why this login test fails and fix it.” The model cannot inspect your files just by thinking about them. It needs a tool, such as a file reader.

The model can respond with a structured **tool call**: a request to read a particular file. The harness runs the tool and returns its result in a new model request. The model can then ask to edit a file, run tests, inspect the result, and decide what to do next.

That repetition is the **agent loop**:

1. Assemble the current instructions, task, relevant history, and available tools.
2. Ask the model for its next action.
3. If it requests a tool, run the tool and collect the result.
4. Add that result to the context and ask the model again.
5. Stop when the task is complete or another stopping condition is met.

A tool call does not mean the model itself executed code or opened a file. The harness did that. The model made a decision based on what it was shown; the harness performed the action and returned an observation.

<div class="agent-steps" aria-label="Interactive four-stage agent loop">
  <h2>Watch the loop grow</h2>
  <p>Choose a stage to see why context has to be rebuilt.</p>
  <input type="radio" name="agent-stage" id="step-1" checked><input type="radio" name="agent-stage" id="step-2"><input type="radio" name="agent-stage" id="step-3"><input type="radio" name="agent-stage" id="step-4">
  <div class="tabs"><label for="step-1">1. Task</label><label for="step-2">2. Tool</label><label for="step-3">3. Repeat</label><label for="step-4">4. Condense</label></div>
  <div class="scenes">
    <div class="scene scene-1"><div class="box"><strong>Input to model</strong><span class="chip">Fix the login test</span><span class="chip">Instructions + available tools</span></div><span class="arrow" aria-hidden="true">→</span><div class="box"><strong>Model output</strong><span class="chip">Request: read login file</span></div></div>
    <div class="scene scene-2"><div class="box"><strong>Harness runs tool</strong><span class="chip">Read login file</span><span class="chip fresh">File contents returned</span></div><span class="arrow" aria-hidden="true">→</span><div class="box"><strong>New input to model</strong><span class="chip">Goal + previous action</span><span class="chip fresh">File contents</span></div></div>
    <div class="scene scene-3"><div class="box"><strong>Model output</strong><span class="chip">Edit code; run test</span></div><span class="arrow" aria-hidden="true">→</span><div class="box"><strong>New input to model</strong><span class="chip">Goal + relevant steps</span><span class="chip fresh">Latest test result</span></div></div>
    <div class="scene scene-4"><div class="box"><strong>Outside the model</strong><span class="chip">Saved history and files</span><span class="chip summary">Summary of earlier work</span><span class="chip fresh">Recent results</span></div><span class="arrow" aria-hidden="true">→</span><div class="box"><strong>Next input to model</strong><span class="chip">Goal + constraints</span><span class="chip summary">Earlier findings</span><span class="chip fresh">Recent results in detail</span></div></div>
  </div>
  <p class="caption">The model sees only what is included in that particular request.</p>
</div>

## The next problem: too much history

Tool results can be long. A single search or test command may produce thousands of lines. After many loop cycles, the full record can exceed the context window. Even before it does, irrelevant material can distract from the current task and increase cost.

So context management asks a practical question: **What does the model need to make the next good decision?** The goal and hard constraints usually matter. The latest test failure may matter. A full log from an abandoned attempt might not.

There are several ways to answer that question:

- **Keep a recent window:** Include the latest exchanges in full. It is simple, but an older decision may fall out.
- **Summarize older work:** Replace earlier messages in the working context with a short account of findings, decisions, changes, and open problems. This saves room but can lose nuance.
- **Select relevant material:** Bring in only the files, notes, or earlier messages related to the current question. This avoids carrying everything, but selection can miss something important.
- **Store durable notes:** Write facts or decisions outside the conversation and retrieve them in later sessions. These notes may become stale, so they need checking.

These methods are often combined. Recent steps stay detailed; older steps become a summary; a relevant file or note is fetched when needed.

## Two memory layers, with concrete examples

The first layer is **working context**: the input assembled for one model call. In the login task, it might contain the task, the rule “do not change the public API,” a summary of earlier debugging, and the latest failed test. The model can act on those details because they are present *now*. On a later call, the harness may assemble a different working context.

The second layer is **stored information outside the model**: session history, project files, or saved notes. Imagine a project note saying “Authentication uses short-lived access tokens and refresh tokens.” A future task about login can retrieve that note and place it in working context. Until then, the model does not know the note merely because it exists in storage.

This separation matters. **Storage is not recall.** Recall happens when the harness chooses relevant stored information and includes it in a model request. A useful design must therefore decide what to save, when to retrieve it, and how to handle old or conflicting information.

## What should survive a handoff?

For a long task, a good summary is closer to a progress note than a transcript. It should say what the goal is, what constraints apply, what has been tried, what changed, what evidence was found, and what to do next. “Worked on login” is too vague. Copying every test log is too much.

The whole system follows from the starting point: the LLM is stateless between calls. The harness supplies continuity by rebuilding context, running requested tools, and managing information across loop cycles. Memory is the information kept outside the model; context is the portion brought back in. The quality of an agent depends heavily on choosing that portion well.
