---
title: "Babelbit SN59: The First Machine Interpreter on Bittensor"
description: "A Tao Outsider deep dive into Babelbit, Subnet 59, and why its speech native translation approach may be one of the most misunderstood projects in Bittensor."
pubDate: 2026-05-29T12:30:00.000Z
category: subnet
featured: true
author: "Tao Outsider"
tags: ["TAO", "Bittensor", "Babelbit", "Subnet 59", "translation"]
image: "/blog/babelbit-subnet-59/babelbit-phrase-completion-latency.jpg"
imageAlt: "Babelbit phrase completion latency benchmark"
ogImage: "/blog/babelbit-subnet-59/babelbit-subnet-59-og.jpg"
---

![Babelbit phrase completion latency benchmark](/blog/babelbit-subnet-59/babelbit-phrase-completion-latency.jpg)

Babelbit is Subnet 59 on Bittensor.

At first glance, it looks easy to understand.

Real time translation.

French goes in. English comes out.

Simple.

But the more I studied Babelbit, the more I realized that the market may be looking at the wrong comparison.

This is not just a decentralized Google Translate.

It is not only trying to make translation faster.

Babelbit is trying to change the shape of machine interpretation itself.

That distinction matters.

Because translation is usually built around text.

Babelbit is trying to build around speech.

## What Babelbit Is Building

The Babelbit profile says it clearly:

Developing low latency speech to speech translation on Bittensor.

That sounds small until you think about what most translation systems actually do.

Speech becomes text.

Text gets translated.

The result gets cleaned.

Then it becomes speech again.

Every step adds delay.

Every conversion can lose meaning.

Every extra layer makes conversation feel less like conversation.

Babelbit wants to remove those steps.

Instead of treating speech and text as separate worlds, Babelbit is building a speech native model that can work directly with tokenized speech.

No speech to text step.

No text to speech step.

One model.

One pass.

Speech in. Speech out.

That is not a small optimization.

That is a different architecture.

## Why This Matters

Real conversation is not built on perfect sentences.

It is built on timing.

A translator can be accurate and still be useless in a live conversation if the answer arrives too late.

This is where Babelbit gets interesting.

Recent Babelbit posts keep returning to the same idea:

The old benchmarks reward the wrong thing.

BLEU and other translation benchmarks mostly measure how closely machine output matches a reference translation.

But in real interpretation, the question is not always:

Did the words match?

The better question is:

Did the meaning arrive fast enough?

That is why Babelbit talks about Phrase Completion Latency.

Not how fast each word arrives.

How fast the meaning arrives.

That sounds like a small change in measurement.

It is not.

It changes the entire target.

## The Example That Explains Everything

Babelbit gave a simple example.

French:

Je pense que vous avez tout a fait raison.

A normal translation would be:

I think you are absolutely right.

Babelbit's interpretation could be:

Agreed.

That is the same meaning.

But it is much shorter.

And because it is shorter, it can arrive faster.

This is the difference between translation and interpretation.

A translator converts what was said.

An interpreter delivers what was meant.

That is the core of the Babelbit thesis.

## My First Conversation With Karas

I spoke with Matthew Karas, founder of Babelbit, on Telegram.

I sent him questions in our old style.

Direct questions. Direct answers.

The first question was simple.

Why does Babelbit need to be built on Bittensor?

His answer was also simple.

The most expensive part of Babelbit's roadmap is training a speech mode transformer network to reach specific feature milestones.

That is exactly the kind of thing Bittensor can make interesting.

Instead of a closed lab trying to solve every feature alone, the subnet can create competitions.

Miners can compete on prediction.

On paraphrasing.

On clarity.

On succinctness.

On politeness.

On new languages.

Validators can use scoring systems to measure whether the outputs are actually improving.

That is the Bittensor logic.

Turn a hard AI problem into a competitive market.

Reward the people who make the system better.

![Karas interview notes](/blog/babelbit-subnet-59/babelbit-karas-interview-01.png)

## Why Google Does Not Kill The Thesis

The second question was the obvious one.

How does Google not make Babelbit useless?

Karas did not pretend there would be no competition.

His answer was more mature than that.

Babelbit will always have competitors.

But the project is not trying to solve the exact same problem as Google Translate.

Google Translate is enormous.

But even taking a small percentage of that market could be a very successful business, especially in specialist areas.

On premises deployments.

Customer specific language models.

Specialist enterprise use cases.

High value translation environments where privacy, customization, latency, and control matter.

Karas used a useful comparison.

Before the iPhone, Apple had a small percentage of the personal computer market.

That did not make Apple irrelevant.

A small share of a huge market can still be massive if the product is different enough.

That is how I think about Babelbit now.

The question is not whether Google exists.

The question is whether Babelbit can create a category where Google's default approach is not the right tool.

## The Transformer Question

Later, I asked Karas a more specific question.

In 2017, the Transformer changed Google Translate because it stopped looking word by word and started looking at the broader context.

That was not only important for translation.

It helped unlock the scaling path for modern AI.

So I asked him:

What is the difference between the impact of the Transformer in Google Translate back in 2017 and the difference Babelbit may create now in real time translation?

His answer helped me understand the project better.

The Google Transformer made translation better because it could look at a whole sentence or phrase at once.

That improved context.

It improved quality.

It moved machine translation away from word by word thinking.

Babelbit wants to keep the benefits of everything transformer networks learned from 2017 to 2025, but rebuild that logic in tokenized speech.

That is the key.

Not text first.

Speech first.

In Karas's framing, speech and language are not separate problems.

They are the same problem expressed through different signals.

If that is right, then rebuilding the transformer approach directly in speech gives Babelbit advantages in latency, meaning, and versatility.

![Babelbit transformer comparison](/blog/babelbit-subnet-59/babelbit-karas-interview-02.png)

## The Latency Advantage

Karas broke the latency advantage into three parts.

First, Babelbit removes steps.

No speech to text.

No text to speech.

If the system does not need to convert through text, it has less work to do before answering.

Second, Babelbit can start early.

Because predictive models can guess what is likely coming next, the system does not always need to wait until the speaker finishes.

Sometimes this is not visible in text at all.

It can be an audio signal.

A rhythm.

A partial phrase.

A probability built from speech itself.

Third, Babelbit can generate the output directly from speech tokens while rewriting according to the goal.

Shorter.

Clearer.

More polite.

More concise.

More natural.

For latency, that means the system can summarize and speak faster.

Again, this is not just faster translation.

It is interpretation behavior.

## The Demo Video

Karas also sent the demo video.

<video controls preload="metadata" poster="/blog/babelbit-subnet-59/babelbit-phrase-completion-latency.jpg" style="width: 100%; border-radius: 8px; border: 1px solid var(--border); background: #000;">
  <source src="/blog/babelbit-subnet-59/babelbit-outsider-final.mp4" type="video/mp4" />
</video>

The video compares Babelbit's first release of its live speech translation system against Google Translate in interpreter mode.

The first thing to understand is that this is still early.

Karas says clearly that this first release does not yet include the cleverest parts of what Babelbit is working on.

The prediction and paraphrasing features are not fully there yet.

Even so, the latency difference is already visible.

In the demo, Babelbit starts speaking English roughly two seconds after hearing the French.

Google starts around 6.4 seconds later.

That is already a big difference.

But the more important part is what happens after that.

Babelbit keeps pace better.

The French finishes, and Babelbit's English finishes shortly after.

Google starts later and finishes much later.

By the end, Google is still around seven seconds behind.

That is the experience gap.

Not benchmark theory.

Not abstract AI talk.

You can hear it.

A conversation with two seconds of delay feels very different from a conversation with seven seconds of delay.

One feels almost live.

The other feels like waiting.

## Why Phrase Completion Latency Matters

The video also explains why Babelbit wants a new benchmark.

Traditional latency metrics often measure word delay.

How long did it take for this word to appear as a matching word in the other language?

That works if translation is mostly word matching.

But it breaks when interpretation becomes smarter.

If a long phrase becomes one word, what exactly are you measuring?

If the French sentence means "I think you are absolutely right" and the English output is "Agreed", there is no clean word by word mapping.

But the meaning arrived.

And it arrived faster.

That is why Babelbit wants to measure phrase completion.

When did the meaning of the input phrase arrive in the output stream?

That is a better question for live interpretation.

And honestly, it feels like the obvious question once you see it.

## The Miner Opportunity

This is where Bittensor becomes important.

Babelbit is not just building a product.

It is turning parts of the product roadmap into competitions.

Recent Babelbit posts mention an ongoing competition for speech and language ML talent.

The target is clear:

Train a low latency transformer network to predict and paraphrase as it translates.

Babelbit says the subnet has paid out around $400,000 over the last six months.

Phase 2 is starting now.

The structure they described is straightforward.

A qualifying round shares part of the bounty between qualifying contestants.

Then an arena distributes the rest to the strongest competitors.

That makes sense.

You do not want a subnet where miners only chase random emissions.

You want a subnet where miners push the product forward.

Prediction.

Speech mode.

Paraphrasing.

New languages.

Better latency.

Better adequacy.

That is the work.

## Why Babelbit Feels Misunderstood

Right now, Babelbit still looks misunderstood to me.

People see translation and think the category is solved.

It is not.

Text translation is not live interpretation.

Accurate translation is not the same as natural conversation.

A slower answer can be technically correct and still destroy the user experience.

That is why Babelbit matters.

It is attacking the latency problem at the architecture level.

It is not only making the old pipeline faster.

It is trying to remove the pipeline.

And if that works, the product category changes.

## The Team Signal

There is also a team signal here.

Babelbit says the founder, Matthew Karas, has spent decades in speech technology.

The team has described itself as small, but deeply experienced.

Four people.

Roughly 50 years of combined speech experience.

Founder Matthew Karas.

Co founder and COO Tom Horner.

Chief scientist Josh.

Lead developer Mica.

That kind of team matters because speech is not a toy problem.

Latency, meaning, user experience, enterprise needs, audio constraints, languages, and model behavior all collide at once.

This is exactly the kind of problem where domain experience matters.

## The Go To Market Signal

Another important detail from recent Babelbit posts:

They are not only talking about research.

They are already talking about go to market.

Babelbit said its first phase includes building a reseller network through B2B systems integrators, targeting marquee brands as early adopters, and using AWS Marketplace as a primary channel to reach resellers.

That does not guarantee success.

Nothing does.

But it shows that the project is not thinking only like a subnet.

It is thinking like a product company.

That is the part I like.

Bittensor gives the incentive layer.

But the world still needs a product that someone wants to use.

## My Read

Here is my current view.

Babelbit is not interesting because it is "translation on Bittensor".

That is too shallow.

Babelbit is interesting because it is asking a better question:

What if machines stopped translating text and started interpreting speech?

That is a much bigger idea.

If they can keep reducing latency, improve phrase completion, make paraphrasing reliable, add languages, and turn miners into a real research engine, then Subnet 59 becomes much more than another AI subnet.

It becomes a serious attempt to build live machine interpretation as a Bittensor market.

And yes, I still think Babelbit may be one of the most undervalued subnets in the ecosystem.

Not because the market is stupid.

Because the product is easy to underestimate until you understand the difference between translation and interpretation.

Once that clicks, the whole thing looks different.

## Final Thought

Google Translate changed translation by understanding more context.

Babelbit is trying to change live interpretation by collapsing the delay between meaning and speech.

That is the real thesis.

Not better text.

Better conversation.

And if Babelbit gets that right, Subnet 59 deserves far more attention than it is getting now.
