---
title: "Multiple mechanisms let a subnet pay for more than one kind of work"
description: "Some subnets split emissions across different tasks. That changes how miners compete and how analysts should read performance."
pubDate: 2026-06-16T12:00:00.000Z
category: guide
featured: false
draft: true
author: "Tao Outsider"
tags: ["TAO", "Bittensor", "Field School", "mechanisms", "Bittensor multiple incentive mechanisms"]
image: "/blog/bittensor-field-school/bittensor-field-school-multiple-mechanisms-lesson.svg"
imageAlt: "Multiple mechanisms let a subnet pay for more than one kind of work"
ogImage: "/blog/bittensor-field-school/bittensor-field-school-multiple-mechanisms-og.jpg"
---

![Multiple mechanisms let a subnet pay for more than one kind of work](/blog/bittensor-field-school/bittensor-field-school-multiple-mechanisms-lesson.svg)

<section class="field-note">

## The point of this lesson

Some subnets split emissions across different tasks. That changes how miners compete and how analysts should read performance.

Many newcomers enter Bittensor through price, hype or a subnet someone mentioned on X. That is understandable. It is also the fastest way to become dependent on other people's confidence.

This module trains a different habit: take one concept, connect it to the live network, then ask what would make the concept fail in practice.

</section>

## The clean version

The hidden skill is separating the mechanism that creates value from the one that only creates activity.

Bittensor is easier to read when you stop treating it as one object. It is a chain, a token, a collection of subnets, a market for validators, a market for miners, a set of local scoring games and a growing stack of data tools.

Trying to hold all of that in your head at once creates fog. Follow the payment path instead: who produces the work, who measures it, who receives emissions, who stakes into the system and what signal tells the chain that this subnet deserves more or less attention.

If you can answer those questions for one concept, you can start answering them for the whole network.

<section class="lab-card">

## Field exercise

Open three tabs: TAO.app, TaoSwap and one subnet GitHub repository. Start with the work before the chart.

First, find what the subnet claims to produce. Second, find how miners are evaluated. Third, find whether the market data shows real attention or only a thin price move.

The exercise builds better questions before conviction.

</section>

## The outlier view

The outlier view: Bittensor feels difficult less because of technical terminology and more because it mixes several forms of truth.

There is protocol truth: what the chain records.

There is market truth: where TAO and alpha are moving.

There is product truth: whether a subnet is useful outside its own emissions loop.

There is social truth: who is paying attention and who is merely repeating a phrase.

There is code truth: what the repository actually implements.

The reader who becomes dangerous is the one who can hold those truths separately before blending them into a thesis.

<div class="concept-grid">

<section>

### Read

Start with official docs and source repositories. They can feel difficult at first, yet they keep you anchored.

</section>

<section>

### Inspect

Use dashboards to watch flow, holders, emissions, slippage and metagraph behavior.

</section>

<section>

### Question

Ask what behavior the incentive mechanism actually rewards.

</section>

<section>

### Update

If the evidence changes, change the thesis. Pride is expensive in subnet markets.

</section>

</div>

## Where to look

Use this source desk while reviewing the lesson:

Bittensor docs: [https://docs.learnbittensor.org/](https://docs.learnbittensor.org/)

Bittensor SDK GitHub: [https://github.com/latent-to/bittensor](https://github.com/latent-to/bittensor)

Subtensor GitHub: [https://github.com/opentensor/subtensor](https://github.com/opentensor/subtensor)

TAO.app: [https://www.tao.app/](https://www.tao.app/)

TAO.app API docs: [https://api.tao.app/docs](https://api.tao.app/docs)

TaoStats docs: [https://docs.taostats.io/](https://docs.taostats.io/)

TaoSwap API: [https://api.taoswap.org/subnets](https://api.taoswap.org/subnets)

TaoFlows: [https://taoflows.app/](https://taoflows.app/)

<section class="reading-stack">

## Review note for Tao Outsider

Primary keyword: Bittensor multiple incentive mechanisms

Editorial status: draft v0.1

Image status: educational image created, X card created

Revision goal: make the lesson more personal, add one concrete subnet example, then tighten the ending.

</section>

<section class="knowledge-check" data-quiz>
  <h2>Knowledge check</h2>
  <fieldset data-answer="b">
    <legend>What is the main habit this module is training?</legend>
    <label><input type="radio" name="q8a" value="a" /> Memorize the most popular explanation.</label>
    <label><input type="radio" name="q8a" value="b" /> Translate the idea into something you can inspect.</label>
    <label><input type="radio" name="q8a" value="c" /> Pick the subnet with the loudest story.</label>
  </fieldset>
  <fieldset data-answer="a">
    <legend>What should you do when the narrative and the data disagree?</legend>
    <label><input type="radio" name="q8b" value="a" /> Slow down and inspect the mechanism, flows and evidence.</label>
    <label><input type="radio" name="q8b" value="b" /> Ignore the data if the team sounds confident.</label>
    <label><input type="radio" name="q8b" value="c" /> Wait for social media to decide.</label>
  </fieldset>
  <fieldset data-answer="c">
    <legend>What makes a Tao Outsider reader different?</legend>
    <label><input type="radio" name="q8c" value="a" /> They collect more tabs than everyone else.</label>
    <label><input type="radio" name="q8c" value="b" /> They memorize ticker symbols.</label>
    <label><input type="radio" name="q8c" value="c" /> They can explain the work, the incentive and the risk in plain English.</label>
  </fieldset>
  <button type="button" data-quiz-submit>Check answers</button>
  <p data-quiz-result aria-live="polite"></p>
</section>

<nav class="course-nav" aria-label="Field School navigation">
  <a href="/field-school/review/bittensor-field-school-incentive-mechanisms/">Previous: Every subnet is only as good as its scoring model</a>
  <a href="/field-school/review/bittensor-field-school-metagraph/">Next: The metagraph is the subnet truth table</a>
</nav>
