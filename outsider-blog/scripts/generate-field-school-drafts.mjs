import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const postDir = path.join(root, 'src/content/blog');
const assetDir = path.join(root, 'public/blog/bittensor-field-school');
const docsDir = path.join(root, 'docs/bittensor-field-school');

mkdirSync(postDir, { recursive: true });
mkdirSync(assetDir, { recursive: true });
mkdirSync(docsDir, { recursive: true });

const sourceDesk = [
  ['Bittensor docs', 'https://docs.learnbittensor.org/'],
  ['Bittensor SDK GitHub', 'https://github.com/latent-to/bittensor'],
  ['Subtensor GitHub', 'https://github.com/opentensor/subtensor'],
  ['TAO.app', 'https://www.tao.app/'],
  ['TAO.app API docs', 'https://api.tao.app/docs'],
  ['TaoStats docs', 'https://docs.taostats.io/'],
  ['TaoSwap API', 'https://api.taoswap.org/subnets'],
  ['TaoFlows', 'https://taoflows.app/'],
  ['Backprop Finance', 'https://backprop.finance/'],
  ['IntoTao', 'https://www.intotao.app/'],
  ['SubnetRadar', 'https://subnetradar.com/'],
  ['AlphaGap', 'https://www.alphagap.io/'],
  ['SubnetStats', 'https://www.subnetstats.app/'],
];

const modules = [
  ['bittensor-field-school-useful-work', 'Bittensor is a market for measuring useful work', 'Start with the primitive many explainers skip: Bittensor only works when a subnet can measure work that someone actually wants.', 'protocol primitive', 'why Bittensor matters', 'The reader should leave with a working definition of useful work that goes beyond a slogan about decentralized AI.'],
  ['bittensor-field-school-bitcoin-comparison', 'Why the Bitcoin comparison helps and then breaks', 'Use Bitcoin as a starting mirror, then separate monetary security from programmable work markets.', 'first principles', 'Bittensor Bitcoin comparison', 'The useful comparison is issuance and open participation. The dangerous comparison is pretending the outputs are the same.'],
  ['bittensor-field-school-subnets', 'Subnets are incentive machines', 'A subnet is closer to a living contest than a normal crypto project. Learn the parts before judging the story.', 'subnets', 'Bittensor subnets explained', 'The core move is to read every subnet as a task, a score and a payout loop.'],
  ['bittensor-field-school-miners', 'Miners are workers with an optimization problem', 'Miners do not mine hashes. They chase a scoring function that may or may not produce real value.', 'participants', 'Bittensor miners explained', 'The miner is always asking what behavior gets paid and what shortcut might also get paid.'],
  ['bittensor-field-school-validators', 'Validators are judges with capital behind them', 'Validators translate subnet work into weights. Their job is technical, economic and political at the same time.', 'participants', 'Bittensor validators explained', 'A validator operates like a measurement business with stake weight.'],
  ['bittensor-field-school-yuma', 'Yuma turns opinions into emissions', 'Yuma Consensus is the on chain referee that converts validator weights into miner and validator rewards.', 'consensus', 'Yuma Consensus explained', 'The reader should understand clipping, stake weighted judgment and why consensus can reward boring accuracy.'],
  ['bittensor-field-school-weight-copying', 'The weight copying problem is the hidden tax on lazy validation', 'Why validators copying each other weakens the measurement layer and why commit reveal exists.', 'consensus', 'Bittensor weight copying', 'This is the first anti tourist lesson: some attacks look like normal participation.'],
  ['bittensor-field-school-incentive-mechanisms', 'Every subnet is only as good as its scoring model', 'A beautiful mission with a bad scoring model becomes a machine for rewarding the wrong behavior.', 'mechanisms', 'Bittensor incentive mechanisms', 'Teach readers to inspect the scoring model before the pitch deck.'],
  ['bittensor-field-school-multiple-mechanisms', 'Multiple mechanisms let a subnet pay for more than one kind of work', 'Some subnets split emissions across different tasks. That changes how miners compete and how analysts should read performance.', 'mechanisms', 'Bittensor multiple incentive mechanisms', 'The hidden skill is separating the mechanism that creates value from the one that only creates activity.'],
  ['bittensor-field-school-metagraph', 'The metagraph is the subnet truth table', 'Learn how UIDs, hotkeys, coldkeys, stake, weights and dividends appear inside a subnet state view.', 'data', 'Bittensor metagraph explained', 'The metagraph is where narratives become inspectable.'],
  ['bittensor-field-school-hotkeys-coldkeys', 'Hotkeys and coldkeys explain who can act and who owns', 'Wallet structure matters because registration, mining, validation and ownership use different keys.', 'wallets', 'Bittensor hotkey coldkey', 'Keys are not trivia. They reveal operational roles and risk.'],
  ['bittensor-field-school-root-subnet', 'Root is the subnet for people who do not want to pick a subnet yet', 'Subnet zero gives subnet agnostic exposure through validators, but it has its own tradeoffs.', 'staking', 'Bittensor root subnet', 'Root is simpler, but simple does not mean neutral.'],
  ['bittensor-field-school-staking', 'Staking is voting with exposure', 'Staking TAO into alpha pools is capital selecting which subnet deserves attention.', 'staking', 'Bittensor staking explained', 'Staking is an opinion with slippage, validator choice and opportunity cost attached.'],
  ['bittensor-field-school-dtao-taoflow', 'dTAO changed the center of gravity', 'Dynamic TAO moved subnet value discovery away from root judgment and toward capital flows.', 'dTAO', 'dTAO explained', 'The reader should understand why flows matter more than vibes after dTAO.'],
  ['bittensor-field-school-alpha-tokens', 'Alpha tokens are claims on subnet specific belief', 'Each alpha token is a local market for one subnet, priced against TAO through its pool.', 'dTAO', 'Bittensor alpha tokens', 'Alpha is where network belief becomes fragile, tradable and inspectable.'],
  ['bittensor-field-school-amm-pools', 'The subnet AMM makes every stake a price event', 'Bittensor subnet tokens use pools where liquidity, price and slippage shape what a position really means.', 'markets', 'Bittensor subnet AMM', 'Teach price as pool geometry, not a number on a screen.'],
  ['bittensor-field-school-slippage', 'Slippage is the cost of being too large for the pool', 'A subnet can look cheap until your own trade moves it. Learn to think in depth, not only price.', 'markets', 'Bittensor subnet slippage', 'Liquidity is the difference between a thesis and a hostage situation.'],
  ['bittensor-field-school-emissions', 'Emissions are the payroll of the network', 'TAO and alpha emissions decide who gets paid, what gets reinforced and what dies quietly.', 'emissions', 'Bittensor emissions explained', 'Readers should trace emissions from subnet flow into participants.'],
  ['bittensor-field-school-taoflow', 'TaoFlow made inflow and outflow the scoreboard', 'The newer flow model rewards subnets that attract net TAO inflows and punishes negative flow.', 'emissions', 'Bittensor TaoFlow', 'Flow is the market telling the chain where belief is moving today.'],
  ['bittensor-field-school-conviction', 'Conviction is commitment with a clock attached', 'Conviction locks alpha to show longer term commitment and gives analysts a new ownership signal.', 'governance', 'Bittensor conviction', 'Conviction is useful because it makes some forms of fake confidence harder.'],
  ['bittensor-field-school-subnet-registration', 'Subnet registration is the cost of opening a new arena', 'Anyone can create a subnet if they can pay and survive the rules. That is powerful and dangerous.', 'builders', 'Bittensor subnet registration', 'Permissionless creation still needs quality control.'],
  ['bittensor-field-school-deregistration', 'Deregistration is how the network makes room', 'Subnets and neurons can lose slots. Learn why scarcity of attention is built into the system.', 'builders', 'Bittensor deregistration', 'A slot is not a trophy. It is a lease on relevance.'],
  ['bittensor-field-school-hyperparameters', 'Hyperparameters are the rule sheet under the scoreboard', 'Tempo, registration cost, UID limits and validator permits change how a subnet behaves.', 'builders', 'Bittensor subnet hyperparameters', 'Good analysts read parameters before they read marketing.'],
  ['bittensor-field-school-subnet-code', 'A subnet GitHub can tell you what the website hides', 'Read repos for incentive code, update cadence, miner instructions and signs of real engineering.', 'research', 'Bittensor subnet GitHub', 'Code activity is not enough, but no code trail is a question.'],
  ['bittensor-field-school-product-surface', 'A subnet without a product surface needs a harder question', 'Some subnets serve developers or validators only. Others should have a visible product. Learn the difference.', 'research', 'Bittensor subnet product', 'Demand a route to usefulness, even when the subnet does not need a consumer app.'],
  ['bittensor-field-school-tao-app', 'TAO.app is the official front door', 'Use TAO.app for explorer data, validator performance, tokenomics and Savant style discovery.', 'platforms', 'TAO.app Bittensor', 'TAO.app is the default orientation layer before deeper research.'],
  ['bittensor-field-school-taoswap', 'TaoSwap shows the market as a living table', 'Use TaoSwap data for market cap, flow, price evolution, holders and conviction across subnets.', 'platforms', 'TaoSwap Bittensor', 'TaoSwap is useful because it turns subnet markets into comparable rows.'],
  ['bittensor-field-school-taoflows', 'TaoFlows turns staking into a tape', 'Use TaoFlows to watch real time liquidity movement instead of waiting for weekly summaries.', 'platforms', 'TaoFlows Bittensor', 'The tape teaches timing, crowd behavior and sudden rotations.'],
  ['bittensor-field-school-backprop', 'Backprop is a screener for the dTAO market', 'Use Backprop for market cap, volume, top gainers, subnet categories and trading context.', 'platforms', 'Backprop Finance Bittensor', 'Backprop is where market structure becomes scannable.'],
  ['bittensor-field-school-subnetradar', 'SubnetRadar is for risk and anomaly hunting', 'Use SubnetRadar to monitor health, conviction, signals and events that deserve follow up.', 'platforms', 'SubnetRadar Bittensor', 'The best use is not blind signals. It is triage.'],
  ['bittensor-field-school-alphagap', 'AlphaGap reads what investors miss between code and market', 'Use AlphaGap style thinking to connect dev updates, social velocity, wallets and valuation gaps.', 'platforms', 'AlphaGap Bittensor', 'The lesson is to watch shipping before the timeline notices.'],
  ['bittensor-field-school-intotao', 'IntoTao is the ecosystem map for newcomers', 'Use IntoTao to discover resources, tools, wallets, education and project surfaces without drowning.', 'platforms', 'IntoTao Bittensor', 'Maps matter because fragmented ecosystems punish lazy navigation.'],
  ['bittensor-field-school-taostats', 'TaoStats is the encyclopedia with an API spine', 'Use TaoStats docs, explorer, staking views and API references to cross check almost everything.', 'platforms', 'TaoStats Bittensor', 'TaoStats is where the chain becomes legible.'],
  ['bittensor-field-school-tao-api', 'APIs turn Bittensor from story into evidence', 'Learn which APIs expose subnets, metagraphs, holders, transactions, slippage and social data.', 'data', 'Bittensor API', 'The reader should know where data can be pulled and where access keys or paid plans may be needed.'],
  ['bittensor-field-school-subnet-categories', 'Subnet categories are useful until they become lazy', 'LLM, compute, data, agents, media and finance subnets need different evaluation criteria.', 'taxonomy', 'Bittensor subnet categories', 'A validator data subnet and a consumer app subnet deserve different rubrics.'],
  ['bittensor-field-school-llm-subnets', 'LLM subnets compete on routing, quality and cost', 'Understand what to inspect in inference, model development and language related subnets.', 'taxonomy', 'Bittensor LLM subnets', 'A good LLM subnet needs measurable service quality, not only model names.'],
  ['bittensor-field-school-compute-subnets', 'Compute subnets sell capacity and reliability', 'Read GPU, serverless and infrastructure subnets through uptime, demand, utilization and pricing.', 'taxonomy', 'Bittensor compute subnets', 'Compute is easier to understand, but harder to fake at scale.'],
  ['bittensor-field-school-data-subnets', 'Data subnets live or die by provenance and demand', 'Scraping, storage and data generation subnets need buyers, quality controls and audit trails.', 'taxonomy', 'Bittensor data subnets', 'Data becomes valuable when someone can trust and use it.'],
  ['bittensor-field-school-agent-subnets', 'Agent subnets should be judged by tasks completed', 'Agents are narrative magnets. Learn to ask what the agent actually does, for whom and how often.', 'taxonomy', 'Bittensor agent subnets', 'Agent claims need task evidence, not screenshots of ambition.'],
  ['bittensor-field-school-media-subnets', 'Media subnets turn attention into a measurable commodity', 'Bitcast, video, content and verification subnets show how Bittensor can reward media production.', 'taxonomy', 'Bittensor media subnets', 'Media work is real when the incentives reward useful reach instead of spam.'],
  ['bittensor-field-school-defi-subnets', 'Financial subnets need risk language, not hype language', 'Lending, trading, liquidity and prediction subnets must be read through counterparties and failure modes.', 'taxonomy', 'Bittensor DeFi subnets', 'Finance subnets should be judged with paranoia and math.'],
  ['bittensor-field-school-red-flags', 'The red flags that make a subnet hard to trust', 'No repo, thin docs, unclear scoring, fake volume, missing product and bad incentives deserve attention.', 'risk', 'Bittensor subnet red flags', 'The goal is to protect curiosity from becoming exit liquidity.'],
  ['bittensor-field-school-scam-vs-fragile', 'A fragile subnet can still be honest', 'Learn the difference between malicious behavior, weak design, early experimentation and honest failure.', 'risk', 'Bittensor subnet risk', 'Nuance matters because Bittensor is full of experiments, some ugly and some early.'],
  ['bittensor-field-school-validator-selection', 'Validator selection is delegated judgment', 'Choosing a validator means choosing how your stake is represented across work markets.', 'staking', 'Bittensor validator selection', 'A validator should be read like an operator, not like a yield number.'],
  ['bittensor-field-school-yield', 'Yield without context is the easiest trap in TAO', 'APY, emissions, alpha price and slippage can point in different directions.', 'staking', 'Bittensor staking yield', 'High yield can be reward, risk or bait. Learn the difference.'],
  ['bittensor-field-school-wallet-analysis', 'Wallet flows reveal behavior before explanations do', 'Track accumulation, rotation, concentration and exits across subnet markets.', 'data', 'Bittensor wallet analysis', 'Wallet analysis should produce questions before it produces certainty.'],
  ['bittensor-field-school-github-research', 'GitHub research is a habit more than a metric', 'Commits, releases, issues and docs should be read as evidence of shipping quality.', 'research', 'Bittensor GitHub research', 'A repo is early evidence and often the first honest room.'],
  ['bittensor-field-school-writing-thesis', 'How to write a subnet thesis without fooling yourself', 'Turn product, incentives, code, flows and risk into a thesis you can update.', 'research', 'Bittensor subnet thesis', 'A thesis should have an invalidation path. Otherwise it is a wish.'],
  ['bittensor-field-school-research-terminal', 'Build your Bittensor research terminal', 'Assemble the daily desk: docs, GitHub, TAO.app, TaoFlows, TaoSwap, Backprop, SubnetRadar, AlphaGap and your notes.', 'workflow', 'Bittensor research terminal', 'The point is not more tabs. The point is faster falsification.'],
  ['bittensor-field-school-thesis-exam', 'The subnet thesis exam', 'The final module gives a repeatable exam for judging any subnet from zero.', 'workflow', 'Bittensor thesis exam', 'This is the graduation test: explain the subnet, measure the work, name the risk and decide what would change your mind.'],
];

const clusters = ['Protocol foundations', 'Subnets and participants', 'dTAO and markets', 'Research platforms', 'Subnet categories', 'Risk and thesis work'];
const publishDays = [2, 4, 6, 0];

function scheduledDate(index) {
  const start = new Date(Date.UTC(2026, 5, 3, 12, 0, 0));
  let date = new Date(start);
  let published = 0;
  while (published < index) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (publishDays.includes(date.getUTCDay())) published += 1;
  }
  return date.toISOString();
}

function esc(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function wrap(value, width = 46) {
  const words = value.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > width) {
      lines.push(line.trim());
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

function moduleSvg(module, index, kind) {
  const [, title, , theme] = module;
  const big = kind === 'og';
  const width = big ? 1200 : 1600;
  const height = big ? 630 : 900;
  const titleLines = wrap(title, big ? 31 : 36).slice(0, 3);
  const number = String(index + 1).padStart(2, '0');
  const palette = ['#7DD3FC', '#FDE68A', '#C4B5FD', '#86EFAC', '#FCA5A5', '#F9A8D4'];
  const accent = palette[index % palette.length];
  const yTitle = big ? 178 : 240;
  const fontSize = big ? 66 : 82;
  const lineGap = big ? 78 : 96;

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#050505"/>
  <rect x="${big ? 42 : 64}" y="${big ? 42 : 64}" width="${width - (big ? 84 : 128)}" height="${height - (big ? 84 : 128)}" rx="32" fill="#0B0B0B" stroke="#242424"/>
  <g opacity="0.55">
    ${Array.from({ length: 10 }, (_, i) => `<path d="M${big ? 90 : 120} ${big ? 118 + i * 46 : 150 + i * 58}H${width - (big ? 90 : 120)}" stroke="#191919"/>`).join('\n    ')}
    ${Array.from({ length: 8 }, (_, i) => `<path d="M${big ? 160 + i * 112 : 210 + i * 170} ${big ? 90 : 120}V${height - (big ? 90 : 120)}" stroke="#151515"/>`).join('\n    ')}
  </g>
  <text x="${big ? 104 : 128}" y="${big ? 122 : 158}" fill="#F5F5F5" font-family="Inter, Arial, sans-serif" font-size="${big ? 34 : 44}" font-weight="800">outsider</text>
  <text x="${width - (big ? 230 : 300)}" y="${big ? 122 : 158}" fill="${accent}" font-family="Inter, Arial, sans-serif" font-size="${big ? 28 : 36}" font-weight="900">Module ${number}</text>
  ${titleLines.map((line, i) => `<text x="${big ? 104 : 128}" y="${yTitle + i * lineGap}" fill="#FFFFFF" font-family="Inter, Arial, sans-serif" font-size="${fontSize}" font-weight="900">${esc(line)}</text>`).join('\n  ')}
  <rect x="${big ? 104 : 128}" y="${big ? 456 : 650}" width="${big ? 210 : 280}" height="${big ? 54 : 66}" rx="12" fill="#FFFFFF"/>
  <text x="${big ? 132 : 164}" y="${big ? 491 : 693}" fill="#000000" font-family="Inter, Arial, sans-serif" font-size="${big ? 21 : 27}" font-weight="900" letter-spacing="1.5">FIELD SCHOOL</text>
  <rect x="${big ? 340 : 460}" y="${big ? 456 : 650}" width="${big ? 220 : 270}" height="${big ? 54 : 66}" rx="12" fill="#111111" stroke="#3A3A3A"/>
  <text x="${big ? 368 : 494}" y="${big ? 491 : 693}" fill="#F1F1F1" font-family="Inter, Arial, sans-serif" font-size="${big ? 21 : 27}" font-weight="800">${esc(theme.toUpperCase())}</text>
  <g transform="translate(${big ? 780 : 1040} ${big ? 200 : 318})">
    <circle cx="94" cy="94" r="92" fill="#101010" stroke="#303030"/>
    <path d="M94 28V188" stroke="${accent}" stroke-width="14" stroke-linecap="round"/>
    <path d="M28 94H188" stroke="#FFFFFF" stroke-width="14" stroke-linecap="round"/>
    <circle cx="94" cy="94" r="26" fill="${accent}"/>
    <circle cx="94" cy="28" r="14" fill="#FFFFFF"/>
    <circle cx="188" cy="94" r="14" fill="#FFFFFF"/>
    <circle cx="94" cy="188" r="14" fill="#FFFFFF"/>
    <circle cx="28" cy="94" r="14" fill="#FFFFFF"/>
  </g>
</svg>`;
}

function quizBlock(index) {
  return `<section class="knowledge-check" data-quiz>
  <h2>Knowledge check</h2>
  <fieldset data-answer="b">
    <legend>What is the main habit this module is training?</legend>
    <label><input type="radio" name="q${index}a" value="a" /> Memorize the most popular explanation.</label>
    <label><input type="radio" name="q${index}a" value="b" /> Translate the idea into something you can inspect.</label>
    <label><input type="radio" name="q${index}a" value="c" /> Pick the subnet with the loudest story.</label>
  </fieldset>
  <fieldset data-answer="a">
    <legend>What should you do when the narrative and the data disagree?</legend>
    <label><input type="radio" name="q${index}b" value="a" /> Slow down and inspect the mechanism, flows and evidence.</label>
    <label><input type="radio" name="q${index}b" value="b" /> Ignore the data if the team sounds confident.</label>
    <label><input type="radio" name="q${index}b" value="c" /> Wait for social media to decide.</label>
  </fieldset>
  <fieldset data-answer="c">
    <legend>What makes a Tao Outsider reader different?</legend>
    <label><input type="radio" name="q${index}c" value="a" /> They collect more tabs than everyone else.</label>
    <label><input type="radio" name="q${index}c" value="b" /> They memorize ticker symbols.</label>
    <label><input type="radio" name="q${index}c" value="c" /> They can explain the work, the incentive and the risk in plain English.</label>
  </fieldset>
  <button type="button" data-quiz-submit>Check answers</button>
  <p data-quiz-result aria-live="polite"></p>
</section>`;
}

function articleBody(module, index) {
  const [slug, title, description, theme, keyword, angle] = module;
  const image = `/blog/bittensor-field-school/${slug}-lesson.svg`;
  const next = modules[index + 1];
  const prev = modules[index - 1];

  return `![${title}](${image})

<section class="field-note">

## The point of this lesson

${description}

Many newcomers enter Bittensor through price, hype or a subnet someone mentioned on X. That is understandable. It is also the fastest way to become dependent on other people's confidence.

This module trains a different habit: take one concept, connect it to the live network, then ask what would make the concept fail in practice.

</section>

## The clean version

${angle}

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

${sourceDesk.slice(0, 8).map(([name, url]) => `${name}: [${url}](${url})`).join('\n\n')}

<section class="reading-stack">

## Review note for Tao Outsider

Primary keyword: ${keyword}

Editorial status: draft v0.1

Image status: educational image created, X card created

Revision goal: make the lesson more personal, add one concrete subnet example, then tighten the ending.

</section>

${quizBlock(index)}

<nav class="course-nav" aria-label="Field School navigation">
  ${prev ? `<a href="/field-school/review/${prev[0]}/">Previous: ${prev[1]}</a>` : `<a href="/field-school/review/">Back to review queue</a>`}
  ${next ? `<a href="/field-school/review/${next[0]}/">Next: ${next[1]}</a>` : `<a href="/field-school/review/">Back to review queue</a>`}
</nav>`;
}

function frontmatter(module, index) {
  const [slug, title, description, theme, keyword] = module;
  const date = scheduledDate(index);
  return `---
title: "${title}"
description: "${description}"
pubDate: ${date}
category: guide
featured: false
draft: true
author: "Tao Outsider"
tags: ["TAO", "Bittensor", "Field School", "${theme}", "${keyword}"]
image: "/blog/bittensor-field-school/${slug}-lesson.svg"
imageAlt: "${title}"
ogImage: "/blog/bittensor-field-school/${slug}-og.jpg"
---
`;
}

function writeImages(module, index) {
  const [slug] = module;
  const lessonSvg = path.join(assetDir, `${slug}-lesson.svg`);
  const ogSvg = path.join(assetDir, `${slug}-og.svg`);
  const ogJpg = path.join(assetDir, `${slug}-og.jpg`);
  writeFileSync(lessonSvg, moduleSvg(module, index, 'lesson'));
  writeFileSync(ogSvg, moduleSvg(module, index, 'og'));
  execFileSync('sips', ['-s', 'format', 'jpeg', ogSvg, '--out', ogJpg], { stdio: 'ignore' });
}

for (const [index, module] of modules.entries()) {
  const [slug] = module;
  writeImages(module, index);
  writeFileSync(
    path.join(postDir, `${slug}.md`),
    `${frontmatter(module, index)}\n${articleBody(module, index)}\n`,
  );
}

const reviewRows = modules.map((module, index) => {
  const [slug, title, description, theme, keyword] = module;
  return [
    index + 1,
    scheduledDate(index).slice(0, 10),
    theme,
    keyword,
    title,
    description,
    `/field-school/review/${slug}/`,
    'draft v0.1',
  ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',');
});

writeFileSync(path.join(docsDir, 'review-queue.csv'), [
  '"order","target_date","cluster","primary_keyword","title","description","review_url","status"',
  ...reviewRows,
].join('\n'));

writeFileSync(path.join(docsDir, 'curriculum.md'), `# Bittensor Field School curriculum

Working name: Bittensor Field School

Positioning: a Tao Outsider learning path for people who want the basics written with operator level judgment, live data habits and outlier thinking.

Total modules: ${modules.length}

## Review workflow

1. Open \`/field-school/review/\` in local preview.
2. Review only one module per pass.
3. Mark one of three decisions in the review queue: approved, revise, hold.
4. Approved modules move from \`draft: true\` to \`draft: false\`.
5. Before publish, run \`npm run check:og\`, \`npm run build\` and the article scanner.

## Publishing rhythm

Recommended cadence: four posts per week for the first 30 days, then three posts per week until the full course is live.

Reason: the first month builds topical authority quickly around the core cluster. The later cadence gives Google time to crawl, gives readers time to follow the course, and leaves room for live event articles without breaking the sequence.

## SEO clusters

${clusters.map(cluster => `- ${cluster}`).join('\n')}

## Modules

${modules.map((module, index) => {
  const [slug, title, description, theme, keyword] = module;
  return `${index + 1}. ${title}
   Date: ${scheduledDate(index).slice(0, 10)}
   Cluster: ${theme}
   Primary keyword: ${keyword}
   Review URL: /field-school/review/${slug}/
   Summary: ${description}`;
}).join('\n\n')}

## Source desk

${sourceDesk.map(([name, url]) => `- [${name}](${url})`).join('\n')}
`);

writeFileSync(path.join(docsDir, 'README.md'), `# Bittensor Field School

This folder controls the Tao Outsider Bittensor Field School editorial rollout.

Files:

- \`curriculum.md\`: complete curriculum, source desk, cadence and module map.
- \`review-queue.csv\`: one row per article for review tracking.

All generated modules are currently \`draft: true\`.
`);

console.log(`Generated ${modules.length} Bittensor Field School draft modules.`);
