---
title: "How Context Management Works in Pi"
description: "How a coding agent carries useful information through a long task without sending its entire history to the model each time."
date: 2026-09-24
---

<style>
.context-flow{margin:2rem 0;padding:1.25rem;border:1px solid #cdd8e4;border-radius:14px;background:#f7fafc;color:#263544}
.context-flow *{box-sizing:border-box}.context-flow h2{margin:0 0 .35rem;font-size:1.2rem}.context-flow p{margin:.3rem 0 1rem}
.context-flow input{position:absolute;opacity:0}.context-flow .controls{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem}
.context-flow label{cursor:pointer;padding:.4rem .8rem;border:1px solid #9cacc0;border-radius:999px;font-size:.86rem}
#flow-1:checked~.controls label[for=flow-1],#flow-2:checked~.controls label[for=flow-2],#flow-3:checked~.controls label[for=flow-3]{background:#344d6b;color:white}
.context-flow .stage{display:none;grid-template-columns:1fr auto 1fr;align-items:center;gap:.65rem;animation:flow-in .3s ease}
#flow-1:checked~.stages .stage-1,#flow-2:checked~.stages .stage-2,#flow-3:checked~.stages .stage-3{display:grid}
.context-flow .box{min-height:125px;padding:.8rem;background:white;border:1px solid #cdd8e4;border-radius:10px}
.context-flow .box strong{display:block;margin-bottom:.45rem}.context-flow .chip{display:block;margin:.25rem 0;padding:.3rem .5rem;border-radius:6px;background:#e7edf5;font-size:.8rem}
.context-flow .summary{background:#ffe4ca}.context-flow .recent{background:#def2e9}.context-flow .arrow{font-size:1.4rem}
.context-flow .note{font-size:.82rem;margin:.85rem 0 0}
@keyframes flow-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:600px){.context-flow .stage{grid-template-columns:1fr}.context-flow .arrow{text-align:center;transform:rotate(90deg)}}
@media(prefers-reduced-motion:reduce){.context-flow .stage{animation:none}}
</style>

A coding agent can spend hours reading files, running commands, and discussing changes with you. The language model behind it, however, has a finite **context window**. It cannot receive an unlimited transcript on every call. So how does the agent continue a long task?

Pi is a useful example. Its **session** records the work, while its **working context** is the material assembled for the model's next response. Those are different things. A detail can remain in the saved session even after it stops appearing word for word in the model's current context.

## What the model sees

Imagine asking Pi to fix a login bug. The first request includes instructions, your goal, and the available tools. Pi reads a file; its result joins the conversation. Pi edits a function and runs a test; those actions and results also become part of the working context. On the next turn, the model can use them to decide what to do.

This is why tool output matters. A test failure is information the model needs for its next decision. But a huge log from an abandoned approach may be less useful later. Context management decides what the next request needs to carry forward within the window's limit.

<div class="context-flow" aria-label="Interactive diagram showing how a Pi session becomes a working context">
  <h2>Follow a long session</h2>
  <p>Select a stage to see what changes in the model's working context.</p>
  <input type="radio" name="flow" id="flow-1" checked>
  <input type="radio" name="flow" id="flow-2">
  <input type="radio" name="flow" id="flow-3">
  <div class="controls"><label for="flow-1">1. Start</label><label for="flow-2">2. Grow</label><label for="flow-3">3. Compact</label></div>
  <div class="stages">
    <div class="stage stage-1"><div class="box"><strong>Saved session</strong><span class="chip">Goal: fix login</span><span class="chip">File read</span></div><span class="arrow" aria-hidden="true">→</span><div class="box"><strong>Next model request</strong><span class="chip">Instructions + goal</span><span class="chip recent">Recent file result</span></div></div>
    <div class="stage stage-2"><div class="box"><strong>Saved session</strong><span class="chip">Goal and file reads</span><span class="chip">Edits and test output</span><span class="chip">More discussion</span></div><span class="arrow" aria-hidden="true">→</span><div class="box"><strong>Next model request</strong><span class="chip">Instructions + history</span><span class="chip recent">Recent edits and tests</span></div></div>
    <div class="stage stage-3"><div class="box"><strong>Saved session</strong><span class="chip">Earlier exchanges recorded</span><span class="chip summary">Compaction summary</span><span class="chip recent">Recent exchanges</span></div><span class="arrow" aria-hidden="true">→</span><div class="box"><strong>Next model request</strong><span class="chip">Instructions</span><span class="chip summary">Summary of older work</span><span class="chip recent">Recent exchanges in detail</span></div></div>
  </div>
  <p class="note">Conceptual view. The exact request also depends on the active branch, tools, and model settings.</p>
</div>

## When the context gets full

Pi can **compact** a conversation as its context approaches the model's limit. It summarizes older exchanges and uses that summary together with newer messages in subsequent model requests. You can also request compaction yourself.

Say Pi spent twenty turns investigating the login bug. A useful summary might be: “The login handler is fine. The refresh path uses an old timestamp. We changed that path; two tests pass, but the logout test still fails.” That carries the findings and the current state without carrying twenty turns of commands and logs verbatim.

Compaction creates room, but compression has a cost. A summary can omit a subtle constraint, an exact error message, or a detail that turns out to matter later. The agent may need to inspect the relevant file or result again. A summary is a handoff, not perfect recall.

## The session is more than the current prompt

Earlier exchanges remain in Pi's saved session even when compaction replaces them with a summary in later model requests. Pi also lets you branch from an earlier point in the session and explore another approach. When you move between branches, it can summarize the work on the branch you leave and carry that information to the branch you enter.

Think of the session as a notebook and the working context as the pages open on your desk. Compaction closes older pages and keeps a concise account of their conclusions. Branching lets you return to an earlier page and try a different direction.

The general lesson goes beyond Pi: a model does not simply “remember” a long project. The harness assembles useful context for each request. A good handoff keeps the **goal, constraints, decisions, current state, and next step** visible. In a coding task, it should also retain which files changed and which checks passed or failed. That is what makes a long agent session coherent.

### Further reading

- [How Pi Works](https://pi.dev/docs/latest/how-pi-works)
- [Sessions and Context](https://pi.dev/docs/latest/sessions)
- [Compaction Reference](https://pi.dev/docs/latest/compaction)
