---
title: "SHA-256: From Intuition to the Maths"
description: "See what SHA-256 is doing, then follow the padding, message schedule, and 64-round compression function step by step."
date: 2026-09-11
---

<link rel="stylesheet" href="{{ '/assets/css/sha256.css' | relative_url }}">

SHA-256 turns any message into a 256-bit number. The message can be a single
letter, a photo, or a file with millions of lines. The result is always the same
size: 256 bits.

You can think of that result as the message's fingerprint. The same message
always gives the same fingerprint. Change even one bit, though, and the new
fingerprint should look unrelated to the old one.

<div class="sha-pipeline" aria-label="SHA-256 pipeline">
  <span style="--step: 0">message</span><b>→</b>
  <span style="--step: 1">pad</span><b>→</b>
  <span style="--step: 2">512-bit blocks</span><b>→</b>
  <span style="--step: 3">64 rounds</span><b>→</b>
  <span style="--step: 4">256-bit digest</span>
</div>

This fingerprint is called a **digest** or **hash**. It is not an encrypted copy
of the message. Encryption is meant to be reversed with a key; a hash is meant
to be one-way.

For a well-designed 256-bit hash, trying to find a message with one chosen hash
takes about 2<sup>256</sup> guesses in the general case. Finding *any two*
messages with the same hash takes about 2<sup>128</sup> guesses because of the
birthday effect. Those numbers are far beyond practical computing power.

Before looking at the equations, try changing either message below.

<div class="sha-demo" id="avalanche-demo">
  <div class="sha-demo__heading">
    <div>
      <span class="sha-kicker">INTERACTIVE 01</span>
      <h2>The avalanche effect</h2>
    </div>
    <output id="avalanche-score" class="sha-score">computing…</output>
  </div>
  <div class="sha-inputs">
    <label>Message A<input id="hash-a" value="abc" spellcheck="false"></label>
    <label>Message B<input id="hash-b" value="abd" spellcheck="false"></label>
  </div>
  <div class="sha-digests">
    <code id="digest-a">SHA-256 is loading…</code>
    <code id="digest-b">SHA-256 is loading…</code>
  </div>
  <div id="bit-grid" class="bit-grid" aria-label="Bit-by-bit digest comparison"></div>
  <p class="sha-demo__note">Each square is one output bit. Amber squares differ; dark squares match.</p>
</div>

Only the last letter changed: `abc` became `abd`. Yet roughly half of the 256
output bits changed. This is the **avalanche effect**. SHA-256 creates it by
mixing the input again and again.

The rest of this article opens the machine. You do not need to memorize the
equations. Read each one as a recipe: it tells us which values are mixed next.

## The big picture

SHA-256 carries eight numbers as it works. Each number is 32 bits long, so the
complete internal state is 8 × 32 = 256 bits:

<div class="math-block">H = (H<sub>0</sub>, H<sub>1</sub>, …, H<sub>7</sub>)</div>

The algorithm follows five steps:

1. Convert the message to bytes.
2. Add padding so its length is a multiple of 512 bits.
3. Split it into 512-bit blocks.
4. Mix each block into the eight-number state using 64 rounds.
5. Join the final eight numbers to produce the 256-bit hash.

The state from one block becomes the starting state for the next block. This is
why SHA-256 can process a huge file without loading the whole file into memory.

## Step 1: make the message fit

The main SHA-256 function only accepts blocks of exactly 512 bits. Most messages
do not naturally have that length, so SHA-256 adds **padding**.

Padding also stores the message's original length. Without that length, inputs
that end in zero bits could become ambiguous after padding.

Let <em>ℓ</em> be the original length in bits. SHA-256 appends:

1. one `1` bit;
2. enough `0` bits to leave 64 bits at the end of the block;
3. <em>ℓ</em>, written as a 64-bit big-endian number.

If <em>k</em> is the number of zero bits, the padded message must satisfy:

<div class="math-block">
  ℓ + 1 + k ≡ 448 (mod 512)<br>
  k = (447 − ℓ) mod 512
</div>

Why 448? The last 64 bits are reserved for the original length, and 448 + 64 =
512.

### Padding `abc`

In UTF-8, `abc` is three bytes:

```text
61 62 63
```

Three bytes are 24 bits, so <em>ℓ</em> = 24. The first padding bit is `1`. At
the byte level it appears as `80`, which is `10000000` in binary. After enough
zeros, the final 64 bits store the number 24, or `18` in hexadecimal.

When the padded block is divided into sixteen 32-bit words, it looks like this:

<div class="block-map" aria-label="The padded abc block split into sixteen words">
  <span><small>W<sub>0</sub></small>61626380</span>
  <span><small>W<sub>1</sub></small>00000000</span>
  <span><small>W<sub>2</sub></small>00000000</span>
  <span><small>W<sub>3</sub></small>00000000</span>
  <span class="block-map__skip">W<sub>4</sub> … W<sub>14</sub> are zero</span>
  <span><small>W<sub>15</sub></small>00000018</span>
</div>

That gives SHA-256 one complete 512-bit block to process.

## The operations SHA-256 uses

From this point on, SHA-256 works with **words**. A word here simply means a
32-bit number.

| Notation | What it means |
|---|---|
| <code>x + y</code> | add the numbers modulo 2<sup>32</sup>; overflow wraps around |
| <code>x ⊕ y</code> | XOR each pair of bits |
| <code>x ∧ y</code> | AND each pair of bits |
| <code>¬x</code> | flip every bit |
| <code>ROTR<sup>n</sup>(x)</code> | rotate right by <em>n</em> places; bits leaving the right side return on the left |
| <code>SHR<sup>n</sup>(x)</code> | shift right by <em>n</em> places; zeros enter on the left |

“Modulo 2<sup>32</sup>” means that we keep only the lowest 32 bits after an
addition. If the number becomes too large, it wraps around.

Rotation moves bits to new positions without losing them. XOR combines bit
patterns. Addition creates carry bits, which lets one bit affect its neighbours.
Together, these simple operations spread changes through the state quickly.

## Step 2: turn 16 words into 64

Each block begins with sixteen 32-bit words, but SHA-256 runs 64 rounds. It needs
one word for every round. It therefore expands the sixteen input words into a
64-word **message schedule**:

<div class="math-block">W<sub>0</sub>, W<sub>1</sub>, …, W<sub>63</sub></div>

The first sixteen words come directly from the padded block. Starting at word
16, each new word is calculated from four older words:

<div class="math-block">
  W<sub>t</sub> = σ<sub>1</sub>(W<sub>t−2</sub>) + W<sub>t−7</sub> + σ<sub>0</sub>(W<sub>t−15</sub>) + W<sub>t−16</sub> mod 2<sup>32</sup>
</div>

The two small sigma functions rotate and shift their input in different ways:

<div class="math-block">
  σ<sub>0</sub>(x) = ROTR<sup>7</sup>(x) ⊕ ROTR<sup>18</sup>(x) ⊕ SHR<sup>3</sup>(x)<br>
  σ<sub>1</sub>(x) = ROTR<sup>17</sup>(x) ⊕ ROTR<sup>19</sup>(x) ⊕ SHR<sup>10</sup>(x)
</div>

This schedule makes one changed input word affect many later rounds. The change
does not stay in one small part of the calculation.

## Step 3: mix the block 64 times

Before the first round, SHA-256 copies its eight state words into eight working
variables named <em>a, b, c, d, e, f, g, h</em>.

It then uses four helper functions:

<div class="math-block math-block--dense">
  Ch(x,y,z) = (x ∧ y) ⊕ (¬x ∧ z)<br>
  Maj(x,y,z) = (x ∧ y) ⊕ (x ∧ z) ⊕ (y ∧ z)<br>
  Σ<sub>0</sub>(x) = ROTR<sup>2</sup>(x) ⊕ ROTR<sup>13</sup>(x) ⊕ ROTR<sup>22</sup>(x)<br>
  Σ<sub>1</sub>(x) = ROTR<sup>6</sup>(x) ⊕ ROTR<sup>11</sup>(x) ⊕ ROTR<sup>25</sup>(x)
</div>

`Ch` means **choose**. Each bit of <em>x</em> chooses whether the result takes
the matching bit from <em>y</em> or <em>z</em>.

`Maj` means **majority**. For each bit position, it returns whichever bit—zero
or one—appears at least twice across <em>x</em>, <em>y</em>, and <em>z</em>.

The capital sigma functions rotate the same word by three different amounts and
XOR the results. They move information between distant bit positions.

### One round

Round <em>t</em> first calculates two temporary 32-bit values:

<div class="math-block">
  T<sub>1</sub> = h + Σ<sub>1</sub>(e) + Ch(e,f,g) + K<sub>t</sub> + W<sub>t</sub><br>
  T<sub>2</sub> = Σ<sub>0</sub>(a) + Maj(a,b,c)
</div>

Here, <em>W</em><sub>t</sub> is the current word from the message schedule.
<em>K</em><sub>t</sub> is a fixed constant for this round.

Next, the eight working variables move one position, and the temporary values
enter the state:

<div class="math-block">
  (a,b,c,d,e,f,g,h) ← (T<sub>1</sub>+T<sub>2</sub>, a, b, c, d+T<sub>1</sub>, e, f, g)
</div>

All additions still wrap modulo 2<sup>32</sup>. This process repeats 64 times,
using a new schedule word and a new constant in every round.

The 64 constants are public. They come from the fractional parts of the cube
roots of the first 64 prime numbers. The eight starting state values similarly
come from square roots of the first eight primes. They are fixed values, not
secret keys.

The visualizer below performs the real SHA-256 calculation. It starts with the
padded `abc` block. Drag the slider to inspect one round, or press play to watch
all 64 rounds.

<div class="sha-demo" id="round-demo">
  <div class="sha-demo__heading">
    <div>
      <span class="sha-kicker">INTERACTIVE 02</span>
      <h2>Inside the compression function</h2>
    </div>
    <label class="trace-input">Message<input id="trace-message" value="abc" maxlength="55" spellcheck="false"></label>
  </div>
  <div class="round-controls">
    <button type="button" id="round-play">Play 64 rounds</button>
    <button type="button" id="round-reset">Reset</button>
    <input id="round-slider" type="range" min="0" max="63" value="0" aria-label="Compression round">
    <output id="round-label">Round 0 / 63</output>
  </div>
  <p id="trace-error" class="trace-error" role="status"></p>
  <div class="round-values">
    <span>W<sub>t</sub><code id="round-w">—</code></span>
    <span>K<sub>t</sub><code id="round-k">—</code></span>
    <span>T<sub>1</sub><code id="round-t1">—</code></span>
    <span>T<sub>2</sub><code id="round-t2">—</code></span>
  </div>
  <div class="state-words" aria-label="Working state after this round">
    <span><b>a</b><code data-word="0">—</code></span>
    <span><b>b</b><code data-word="1">—</code></span>
    <span><b>c</b><code data-word="2">—</code></span>
    <span><b>d</b><code data-word="3">—</code></span>
    <span><b>e</b><code data-word="4">—</code></span>
    <span><b>f</b><code data-word="5">—</code></span>
    <span><b>g</b><code data-word="6">—</code></span>
    <span><b>h</b><code data-word="7">—</code></span>
  </div>
  <p class="sha-demo__note">Values are hexadecimal. The state shown is immediately after the selected round.</p>
</div>

## Step 4: add the result back

After round 63, SHA-256 adds the working variables <em>a</em> through <em>h</em>
back into the eight state words <em>H</em><sub>0</sub> through
<em>H</em><sub>7</sub>. Each addition wraps modulo 2<sup>32</sup>.

This is called **feed-forward**. It combines the result of the 64 rounds with
the state that entered the block.

If another 512-bit block remains, the updated state becomes that block's input.
After the last block, SHA-256 joins the eight state words:

<div class="math-block">digest = H<sub>0</sub> ∥ H<sub>1</sub> ∥ … ∥ H<sub>7</sub></div>

The symbol `∥` means “join these values together.” For `abc`, the final hash is:

```text
ba7816bf8f01cfea414140de5dae2223
b00361a396177a9cb410ff61f20015ad
```

The hash contains 64 hexadecimal digits. One hexadecimal digit represents four
bits, so 64 × 4 = 256 bits.

## Where the avalanche comes from

We can now connect the equations to the first demo:

- The message schedule carries each input change into many rounds.
- Rotations move bits to different positions.
- XOR combines several bit patterns.
- Addition creates carries, allowing one bit to affect nearby bits.
- `Ch` and `Maj` mix three words at a time.
- Feed-forward connects each block to everything processed before it.

After 64 rounds, the path from one input bit to one output bit is extremely
tangled. There is no known practical shortcut for running that process backward
or for controlling the final hash.

## What SHA-256 is good for

SHA-256 is useful for checking whether data changed, identifying content,
supporting digital signatures, and building other cryptographic systems.

But plain SHA-256 is not the right tool for every security problem:

- **Passwords:** SHA-256 is too fast. Use a slow, salted password hash such as
  Argon2id, scrypt, or bcrypt.
- **Authenticating messages:** use HMAC-SHA-256. A home-made construction such
  as `SHA256(secret || message)` can suffer from a length-extension attack.
- **Hiding data:** use encryption. Hashing does not hide a message and provides
  no way to decrypt it.
- **Checking a download:** get the expected hash from a trusted source. If an
  attacker can replace both the file and its published hash, the check proves
  nothing.

<script src="{{ '/assets/js/sha256.js' | relative_url }}" defer></script>
