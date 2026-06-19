---
title: "New Root SN0: why Root Reborn matters for dTAO"
description: "Root Reborn would change Root staking from automatic subnet selling into validator directed subnet reinvestment."
pubDate: 2026-06-16T16:00:00Z
category: analysis
contentType: news
newsEligible: true
featured: false
author: "Tao Outsider"
tags: ["Root Reborn", "Root", "SN0", "Bittensor", "TAO", "dTAO"]
image: "/images/decentralized-ai/new-root-sn0-root-reborn.png"
imageAlt: "Root SN0 redirecting staking yield into selected Bittensor subnet baskets."
ogImage: "/images/decentralized-ai/new-root-sn0-root-reborn.png"
---

Root Reborn is one of the most important Bittensor proposals to watch right now because it changes the direction of Root staking.

Today, Root staking is often understood as the safer and simpler way to stake TAO. You stake to a Root validator. That validator earns alpha dividends across the subnets it validates. By default, those alpha dividends are converted back into TAO and restaked on Root.

That default behavior makes Root feel clean for the staker, but it creates a structural problem for subnet alpha: Root receives subnet dividends, then sells them into TAO.

Const framed the current pressure at roughly 1,000 TAO per day during an X Space hosted by Jesus Martinez. Treat that number as a speaker estimate, not a finalized protocol metric. Even with that caveat, the direction is the important part.

Instead of Root behaving like an automatic subnet seller, Root validators would direct those dividends into selected subnet baskets. Yield that used to leave subnet alpha markets would be reinvested across validator chosen allocations.

That is the whole topic: New Root SN0. Less automatic selling. More reinvestment. More curation. More capital staying inside Bittensor.

## What Root Reborn proposes

Root Reborn is Pull Request 2759 in the OpenTensor Subtensor repository, opened by unconst on June 15, 2026.

The PR is still open, unmerged, and outside mainnet. That caveat matters because this proposal is powerful enough to change how people think about Root staking.

The PR describes the current Root system as a yield mechanism funded by selling. Every block, Root dividends are automatically swapped out of subnets into TAO. Root Reborn changes that path by letting Root validators set a distribution vector over subnets. Their Root dividends would be reinvested into a compounding basket, staked back under the validator, and redeemable to TAO on demand by stakers.

Plain English: Root validators would stop being passive yield pipes and become capital allocators.

The behavior itself is not entirely new to the ecosystem. Trusted Stake, Mentat Minds, Crucible and other operators already route Root yield into subnet alpha baskets in different ways. The difference is that Root Reborn would bring that behavior on chain, standardized, visible, trust minimized and verifiable.

That is a serious distinction. Off chain curation depends on trust, reporting and operator execution. On chain curation can become a protocol visible field.

## Why this matters

dTAO made every subnet a market. That created a new problem: capital flows matter more than narrative.

If Root keeps receiving alpha dividends from subnets and automatically converting them into TAO, then Root can become a persistent seller of subnet alpha. That does not mean Root is malicious. It means the mechanism itself pushes value out of alpha markets and back into TAO.

Root Reborn changes the sign of that flow. Instead of alpha dividends being routed into automatic selling, they can become subnet reinvestment.

That could matter in several ways.

1. It could reduce structural sell pressure on subnet alpha.

2. It could create extra buy pressure for selected subnets.

3. It could keep more capital circulating inside the Bittensor subnet economy.

4. It could make Root staking more attractive if validator baskets perform well.

5. It could make validator allocation decisions visible and economically important.

6. It could force stakers to care about how their validator thinks.

That last point is the real change. Root staking would move beyond choosing a reputable validator with good yield. It would also become a question of whose subnet allocation judgment you trust.

Const's larger frame is that TAO begins to look less like a simple staking asset and more like a decentralized bank of assets, or a hedge fund that curates subnet tokens through validators. That language is imperfect, but useful. It points to the same thing: Root yield becomes capital allocation.

## The validator basket becomes the product

Under Root Reborn, the validator basket becomes a new object of analysis.

A validator could allocate Root dividend flow across Chutes, Targon, Quasar, NOVA, Bitcast, Endure, or any other subnet it believes deserves capital.

That allocation would matter because it affects staker return. The validator would no longer only score miners inside subnets. The validator would also express a capital allocation view across subnets.

That changes the social contract. A good validator has to explain its basket.

Why this subnet? Why this weight? Why now? What happens if liquidity is thin? What happens if the subnet narrative is strong but product proof is weak? What happens if the validator allocates to its friends, its own ecosystem, or weak subnets with good politics?

Those questions become part of Root staking.

This is good if the ecosystem wants more serious capital behavior. It is risky if stakers do not monitor validators.

It also brings validators back into the game in a way that normal users can understand.

Today, many stakers care about the validator name, apparent yield and reputation. Under Root Reborn, they would also care about the validator's portfolio judgment.

That is a more adult market.

## The control mechanism is staker oversight

The proposal gives validators more active responsibility, which creates the obvious fear that validators get too much power. The answer is not blind trust. The answer is visible basket performance.

If a validator allocates Root yield into weak subnets, the basket should underperform. If the basket underperforms, stakers can move. If stakers move, the validator loses Root capital.

That is the intended discipline.

Yield becomes the scoreboard.

This is a better conversation than pretending all validators are equal.

Bittensor already depends on validators. Root Reborn would make their subnet allocation judgment easier to see.

That can create accountability and politics at the same time.

This is where user choice matters. If a staker dislikes the dynamic yield exposure, the practical path is to claim continuously and keep the experience closer to the current model. Principal remains in Root. The changing part is the yield path, because yield can sit in alpha until claimed.

That distinction should stay clear. Root Reborn does not mean users are forced into a random subnet position with their principal. It means yield can be reinvested before the user claims it.

## Why this could be good for subnets

The strongest part of Root Reborn is the potential impact on subnet alpha markets.

Many dTAO participants have felt the same pain: a subnet can look promising, receive emissions, attract attention, then still face constant pressure as rewards are converted back into TAO.

If Root yield becomes reinvestment, selected subnets receive a different kind of support: recurring validator directed flow, rather than one time rotation.

That is a cleaner form of demand if the basket logic is good. It could make serious subnets more resilient and weak subnets more visibly ignored. That is healthy.

In a good version of dTAO, capital does not support every subnet equally forever. Capital has to discriminate.

Root Reborn makes that discrimination part of the validator job.

The downside for subnets is also important. A subnet that receives no allocation from Root validators is not made worse than the current model by that alone. It simply fails to receive new support from this mechanism.

If validators do allocate to it, Root can become net positive buy pressure. That is the actual change.

## Why this could be risky

The proposal is powerful, and powerful mechanisms need ugly questions.

First: liquidity. If a validator basket buys into thin pools, the buying itself can move price. That may look good on a chart, but it can also create poor execution and fragile gains.

Second: self dealing. Validators may have relationships, positions, incentives or public commitments around certain subnets. Root Reborn could make those conflicts more important.

Third: concentration. If large validators allocate similarly, Root capital may crowd into the same popular subnets and ignore smaller but serious projects.

Fourth: implementation. The current PR has active technical review. The GitHub review flagged issues around migration, unbounded basket fanout, and subnet dissolve logic. The PR itself lists known follow ups such as weight metering, slippage guards and migration changes before mainnet scale.

That means the concept can be strong while the implementation still needs work. Those are different questions, and we should not confuse them.

The safeguards matter because this mechanism touches recurring capital flow. Slippage guards, basket limits, migration logic, claim behavior and UI visibility are not minor details. They decide whether Root Reborn becomes clean capital allocation or another mechanism that advanced users understand before everyone else.

## What changes for Root stakers

If Root Reborn ships, Root stakers will need a better checklist.

Today, many people think about Root staking as simple TAO yield.

After Root Reborn, the better questions become:

1. Which validator am I staking to?

2. What subnets does this validator allocate toward?

3. Is the basket concentrated or diversified?

4. Does the validator explain its allocation logic?

5. Is the validator chasing APY, product proof, liquidity, relationships or something else?

6. How does the basket perform in TAO terms?

7. What happens during subnet drawdowns?

8. Can I compare validator baskets in a dashboard?

This is where TaoStats, TAO.app, wallets and other ecosystem tools become important.

If validator baskets become real, the market will need clear interfaces for stakers. Root Reborn without visibility would be hard for normal users. Root Reborn with visibility could make Root staking more intelligent.

The best version of the product would let a staker compare validators like allocation managers:

1. Current basket.

2. Basket performance in TAO terms.

3. Realized yield after slippage.

4. Concentration by subnet.

5. Changes over time.

6. Claim frequency and user experience.

7. Historical drawdown.

8. Public explanation from the validator.

That is the dashboard this proposal implies.

## The Tao Outsider read

Root Reborn is powerful because it changes Root from a passive staking surface into an allocation layer. That is the right way to understand it.

Root dividends would stop being mechanically treated as something to sell back into TAO. Validators could redirect that flow into subnet baskets. Stakers would then judge validators by the quality of that allocation.

This could reduce structural sell pressure on alpha, create recurring buy pressure for selected subnets, make Root staking more attractive, make validator judgment more important, and expose poor validators faster.

The risk is that this gives the market another mechanism it can misunderstand.

Root Reborn does not make every subnet stronger. It makes allocation matter more, which is a serious upgrade in responsibility.

For me, the key line is this: Root staking may stop being only a place to park TAO. It may become the place where Bittensor's validators show what they actually believe deserves capital.

That is worth watching.

Sources checked on June 16, 2026: [Root Reborn Pull Request 2759](https://github.com/opentensor/subtensor/pull/2759), [Bittensor docs on Root Subnet](https://docs.learnbittensor.org/subnets/understanding-subnets), [Bittensor Root Claim docs](https://docs.learnbittensor.org/staking-and-delegation/root-claims), [Bittensor emissions docs](https://docs.learnbittensor.org/learn/emissions), [TAOStats staking in dTAO docs](https://docs.taostats.io/docs/staking-in-dtao), [Our Crypto Talk coverage of Root Reborn](https://ourcryptotalk.com/news/bittensor-root-reborn-pr-2759), and Tao Outsider notes from the X Space hosted by Jesus Martinez with Const.
