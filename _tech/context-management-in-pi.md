---
title: "How an AI Agent Remembers What It Is Doing"
description: "From a stateless LLM to an agent loop: tool calls, working context, summaries, and memory that lasts beyond one conversation."
date: 2026-09-24
---

<style>
.agent-loop{margin:2rem 0;padding:1.25rem;border:1px solid #ced9e4;border-radius:14px;background:#f7fafc;color:#263544}
.agent-loop *{box-sizing:border-box}.agent-loop h2{font-size:1.2rem;margin:0 0 .4rem}.agent-loop p{margin:.35rem 0 1rem}
.agent-loop input{position:absolute;opacity:0}.agent-loop .tabs{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem}
.agent-loop label{cursor:pointer;padding:.4rem .8rem;border:1px solid #9babbc;border-radius:999px;font-size:.85rem}
#loop-1:checked~.tabs label[for=loop-1],#loop-2:checked~.tabs label[for=loop-2],#loop-3:checked~.tabs label[for=loop-3],#loop-4:checked~.tabs label[for=loop-4]{background:#344d6b;color:white}
.agent-loop .scene{display:none;grid-template-columns:1fr auto 1fr;align-items:center;gap:.7rem;animation:loop-in .3s ease}
#loop-1:checked~.scenes .scene-1,#loop-2:checked~.scenes .scene-2,#loop-3:checked~.scenes .scene-3,#loop-4:checked~.scenes .scene-4{display:grid}
.agent-loop .box{min-height:135px;padding:.8rem;background:white;border:1px solid #ced9e4;border-radius:10px}
.agent-loop .box strong{display:block;margin-bottom:.5rem}.agent-loop .chip{display:block;margin:.25rem 0;padding:.3rem .5rem;border-radius:6px;background:#e7edf5;font-size:.8rem}
.agent-loop .result{background:#ddf1e9}.agent-loop .summary{background:#ffe5cc}.agent-loop .arrow{font-size:1.5rem}.agent-loop .caption{margin:.85rem 0 0;font-size:.82rem}
@keyframes loop-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:600px){.agent-loop .scene{grid-template-columns:1fr}.agent-loop .arrow{text-align:center;transform:rotate(90deg)}}
@media(prefers-reduced-motion:reduce){.agent-loop .scene{animation:none}}
</style>

An LLM takes an input and produces an output. If you call it again, it does not automatically have the previous call in its head. You have to send the relevant information again. That is what **stateless** means here.

A chat app can *look* as if the model remembers because the app sends earlier messages along with your new one. An agent goes further: it can call tools, inspect their results, decide what to do next, and repeat. The software surrounding the model manages that process. People often call it an **agent harness**.

## First, what is an agent loop?

Suppose you ask an agent: “Find why the login test fails and fix it.”

1. The harness sends the model your request, instructions, and descriptions of tools it may use.
2. The model replies with a tool call, such as “read the login file.” A tool call is a structured request; it is not the model opening the file by itself.
3. The harness executes the tool and returns its output to the model in another request.
4. With that new information, the model may edit the code and call the test tool.
5. The harness returns the test result. The cycle continues until the model gives a final answer or the run stops.

The loop is roughly **assemble context → ask model → execute requested tool → add result → ask again**. One model response is only one step. The harness supplies continuity between steps.

<div class="agent-loop" aria-label="Interactive illustration of an agent loop">
  <h2>Follow the login task</h2>
  <p>Tap through four stages to see what reaches the model.</p>
  <input type="radio" name="loop" id="loop-1" checked><input type="radio" name="loop" id="loop-2"><input type="radio" name="loop" id="loop-3"><input type="radio" name="loop" id="loop-4">
  <div class="tabs"><label for="loop-1">1. Ask</label><label for="loop-2">2. Use tool</label><label for="loop-3">3. Continue</label><label for="loop-4">4. Make room</label></div>
  <div class="scenes">
    <div class="scene scene-1"><div class="box"><strong>Harness sends</strong><span class="chip">Fix the login test</span><span class="chip">Instructions + available tools</span></div><span class="arrow" aria-hidden="true">→</span><div class="box"><strong>Model responds</strong><span class="chip">Call the file-reading tool</span></div></div>
    <div class="scene scene-2"><div class="box"><strong>Harness executes</strong><span class="chip">Read login file</span><span class="chip result">Return file contents</span></div><span class="arrow" aria-hidden="true">→</span><div class="box"><strong>Next model request</strong><span class="chip">Goal + earlier steps</span><span class="chip result">File contents</span></div></div>
    <div class="scene scene-3"><div class="box"><strong>Model responds</strong><span class="chip">Edit refresh logic</span><span class="chip">Run tests</span></div><span class="arrow" aria-hidden="true">→</span><div class="box"><strong>Next model request</strong><span class="chip">Goal + current work</span><span class="chip result">Test results</span></div></div>
    <div class="scene scene-4"><div class="box"><strong>Stored session</strong><span class="chip">Full earlier exchanges</span><span class="chip summary">Summary of findings</span><span class="chip result">Recent test results</span></div><span class="arrow" aria-hidden="true">→</span><div class="box"><strong>Next model request</strong><span class="chip">Instructions + goal</span><span class="chip summary">Summary of older work</span><span class="chip result">Recent steps in detail</span></div></div>
  </div>
  <p class="caption">Simplified view. The harness controls what gets sent and when a tool is run.</p>
</div>

## So where does “memory” live?

The model's **context window** is the amount of material it can receive in one request. The harness builds a *working context* inside that window: instructions, relevant conversation, tool results, and sometimes retrieved notes. A saved conversation or database can hold much more than one request can fit.

That gives us two useful layers:

| Layer | What it holds | How it helps |
|---|---|---|
| Working context | The goal, recent messages, relevant tool results, and perhaps a summary | Gives the model enough information for its next decision |
| Stored memory | Session history, project files, notes, or facts saved outside the model | Lets the harness bring back relevant information later |

Stored information does not help just because it exists. The harness must **select and insert** it into a future model request. Nor is everything called memory equally durable: a recent message may disappear from working context after compaction; a project note can survive across sessions.

## Two ways to manage those layers

**Example 1: Keep recent work and summarize the old.** In a long coding session, a harness can keep the latest tool calls and results in detail while turning earlier work into a concise summary. Pi does this through **compaction**. If twenty turns established that a login failure comes from the refresh path, the next request might carry that finding, the files changed, and the latest failing test, instead of all twenty turns verbatim. Pi keeps the original exchanges in its saved session; the summary replaces older exchanges in subsequent model requests. This saves context space, but a summary can miss a detail, so the agent may have to read a file again.

**Example 2: Save notes and retrieve them later.** Imagine an assistant that stores “This project uses PostgreSQL” in a project note. Weeks later you ask about a database migration. The harness looks up that note and adds it to the request. For an unrelated question, it may leave the note out. This is **retrieval-based memory**: store useful information outside the context window, then fetch it when relevant. The same idea works with documentation, files, or a searchable knowledge base. It depends on retrieving the right item and checking whether an old note is still true.

Real agents often combine these methods. A session summary preserves progress *within* a long task. Retrieved notes or files bring information *into* a task when needed.

## What matters in a good handoff?

For the login example, a useful handoff says: the goal, constraints, what was tried, what changed, which tests passed or failed, and the next step. “Worked on login” is too vague. Dumping every line of a test log is often too much.

Context management is therefore a selection problem, not a magic memory feature. The model reasons over what it receives *now*. The harness runs the loop, handles tools, stores history, and decides which parts of that history or other memory sources should accompany the next request.

### Further reading

- [Pi: How Pi Works](https://pi.dev/docs/latest/how-pi-works)
- [Pi: Sessions and Context](https://pi.dev/docs/latest/sessions)
- [Pi: Compaction Reference](https://pi.dev/docs/latest/compaction)
