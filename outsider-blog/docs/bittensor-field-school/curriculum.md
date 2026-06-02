# Bittensor Field School curriculum

Working name: Bittensor Field School

Positioning: a Tao Outsider learning path for people who want the basics written with operator level judgment, live data habits and outlier thinking.

Total modules: 50

## Review workflow

1. Open `/field-school/review/` in local preview.
2. Review only one module per pass.
3. Mark one of three decisions in the review queue: approved, revise, hold.
4. Approved modules move from `draft: true` to `draft: false`.
5. Before publish, run `npm run check:og`, `npm run build` and the article scanner.

## Publishing rhythm

Recommended cadence: four posts per week for the first 30 days, then three posts per week until the full course is live.

Reason: the first month builds topical authority quickly around the core cluster. The later cadence gives Google time to crawl, gives readers time to follow the course, and leaves room for live event articles without breaking the sequence.

## SEO clusters

- Protocol foundations
- Subnets and participants
- dTAO and markets
- Research platforms
- Subnet categories
- Risk and thesis work

## Modules

1. Bittensor is a market for measuring useful work
   Date: 2026-06-03
   Cluster: protocol primitive
   Primary keyword: why Bittensor matters
   Review URL: /field-school/review/bittensor-field-school-useful-work/
   Summary: Start with the primitive many explainers skip: Bittensor only works when a subnet can measure work that someone actually wants.

2. Why the Bitcoin comparison helps and then breaks
   Date: 2026-06-04
   Cluster: first principles
   Primary keyword: Bittensor Bitcoin comparison
   Review URL: /field-school/review/bittensor-field-school-bitcoin-comparison/
   Summary: Use Bitcoin as a starting mirror, then separate monetary security from programmable work markets.

3. Subnets are incentive machines
   Date: 2026-06-06
   Cluster: subnets
   Primary keyword: Bittensor subnets explained
   Review URL: /field-school/review/bittensor-field-school-subnets/
   Summary: A subnet is closer to a living contest than a normal crypto project. Learn the parts before judging the story.

4. Miners are workers with an optimization problem
   Date: 2026-06-07
   Cluster: participants
   Primary keyword: Bittensor miners explained
   Review URL: /field-school/review/bittensor-field-school-miners/
   Summary: Miners do not mine hashes. They chase a scoring function that may or may not produce real value.

5. Validators are judges with capital behind them
   Date: 2026-06-09
   Cluster: participants
   Primary keyword: Bittensor validators explained
   Review URL: /field-school/review/bittensor-field-school-validators/
   Summary: Validators translate subnet work into weights. Their job is technical, economic and political at the same time.

6. Yuma turns opinions into emissions
   Date: 2026-06-11
   Cluster: consensus
   Primary keyword: Yuma Consensus explained
   Review URL: /field-school/review/bittensor-field-school-yuma/
   Summary: Yuma Consensus is the on chain referee that converts validator weights into miner and validator rewards.

7. The weight copying problem is the hidden tax on lazy validation
   Date: 2026-06-13
   Cluster: consensus
   Primary keyword: Bittensor weight copying
   Review URL: /field-school/review/bittensor-field-school-weight-copying/
   Summary: Why validators copying each other weakens the measurement layer and why commit reveal exists.

8. Every subnet is only as good as its scoring model
   Date: 2026-06-14
   Cluster: mechanisms
   Primary keyword: Bittensor incentive mechanisms
   Review URL: /field-school/review/bittensor-field-school-incentive-mechanisms/
   Summary: A beautiful mission with a bad scoring model becomes a machine for rewarding the wrong behavior.

9. Multiple mechanisms let a subnet pay for more than one kind of work
   Date: 2026-06-16
   Cluster: mechanisms
   Primary keyword: Bittensor multiple incentive mechanisms
   Review URL: /field-school/review/bittensor-field-school-multiple-mechanisms/
   Summary: Some subnets split emissions across different tasks. That changes how miners compete and how analysts should read performance.

10. The metagraph is the subnet truth table
   Date: 2026-06-18
   Cluster: data
   Primary keyword: Bittensor metagraph explained
   Review URL: /field-school/review/bittensor-field-school-metagraph/
   Summary: Learn how UIDs, hotkeys, coldkeys, stake, weights and dividends appear inside a subnet state view.

11. Hotkeys and coldkeys explain who can act and who owns
   Date: 2026-06-20
   Cluster: wallets
   Primary keyword: Bittensor hotkey coldkey
   Review URL: /field-school/review/bittensor-field-school-hotkeys-coldkeys/
   Summary: Wallet structure matters because registration, mining, validation and ownership use different keys.

12. Root is the subnet for people who do not want to pick a subnet yet
   Date: 2026-06-21
   Cluster: staking
   Primary keyword: Bittensor root subnet
   Review URL: /field-school/review/bittensor-field-school-root-subnet/
   Summary: Subnet zero gives subnet agnostic exposure through validators, but it has its own tradeoffs.

13. Staking is voting with exposure
   Date: 2026-06-23
   Cluster: staking
   Primary keyword: Bittensor staking explained
   Review URL: /field-school/review/bittensor-field-school-staking/
   Summary: Staking TAO into alpha pools is capital selecting which subnet deserves attention.

14. dTAO changed the center of gravity
   Date: 2026-06-25
   Cluster: dTAO
   Primary keyword: dTAO explained
   Review URL: /field-school/review/bittensor-field-school-dtao-taoflow/
   Summary: Dynamic TAO moved subnet value discovery away from root judgment and toward capital flows.

15. Alpha tokens are claims on subnet specific belief
   Date: 2026-06-27
   Cluster: dTAO
   Primary keyword: Bittensor alpha tokens
   Review URL: /field-school/review/bittensor-field-school-alpha-tokens/
   Summary: Each alpha token is a local market for one subnet, priced against TAO through its pool.

16. The subnet AMM makes every stake a price event
   Date: 2026-06-28
   Cluster: markets
   Primary keyword: Bittensor subnet AMM
   Review URL: /field-school/review/bittensor-field-school-amm-pools/
   Summary: Bittensor subnet tokens use pools where liquidity, price and slippage shape what a position really means.

17. Slippage is the cost of being too large for the pool
   Date: 2026-06-30
   Cluster: markets
   Primary keyword: Bittensor subnet slippage
   Review URL: /field-school/review/bittensor-field-school-slippage/
   Summary: A subnet can look cheap until your own trade moves it. Learn to think in depth, not only price.

18. Emissions are the payroll of the network
   Date: 2026-07-02
   Cluster: emissions
   Primary keyword: Bittensor emissions explained
   Review URL: /field-school/review/bittensor-field-school-emissions/
   Summary: TAO and alpha emissions decide who gets paid, what gets reinforced and what dies quietly.

19. TaoFlow made inflow and outflow the scoreboard
   Date: 2026-07-04
   Cluster: emissions
   Primary keyword: Bittensor TaoFlow
   Review URL: /field-school/review/bittensor-field-school-taoflow/
   Summary: The newer flow model rewards subnets that attract net TAO inflows and punishes negative flow.

20. Conviction is commitment with a clock attached
   Date: 2026-07-05
   Cluster: governance
   Primary keyword: Bittensor conviction
   Review URL: /field-school/review/bittensor-field-school-conviction/
   Summary: Conviction locks alpha to show longer term commitment and gives analysts a new ownership signal.

21. Subnet registration is the cost of opening a new arena
   Date: 2026-07-07
   Cluster: builders
   Primary keyword: Bittensor subnet registration
   Review URL: /field-school/review/bittensor-field-school-subnet-registration/
   Summary: Anyone can create a subnet if they can pay and survive the rules. That is powerful and dangerous.

22. Deregistration is how the network makes room
   Date: 2026-07-09
   Cluster: builders
   Primary keyword: Bittensor deregistration
   Review URL: /field-school/review/bittensor-field-school-deregistration/
   Summary: Subnets and neurons can lose slots. Learn why scarcity of attention is built into the system.

23. Hyperparameters are the rule sheet under the scoreboard
   Date: 2026-07-11
   Cluster: builders
   Primary keyword: Bittensor subnet hyperparameters
   Review URL: /field-school/review/bittensor-field-school-hyperparameters/
   Summary: Tempo, registration cost, UID limits and validator permits change how a subnet behaves.

24. A subnet GitHub can tell you what the website hides
   Date: 2026-07-12
   Cluster: research
   Primary keyword: Bittensor subnet GitHub
   Review URL: /field-school/review/bittensor-field-school-subnet-code/
   Summary: Read repos for incentive code, update cadence, miner instructions and signs of real engineering.

25. A subnet without a product surface needs a harder question
   Date: 2026-07-14
   Cluster: research
   Primary keyword: Bittensor subnet product
   Review URL: /field-school/review/bittensor-field-school-product-surface/
   Summary: Some subnets serve developers or validators only. Others should have a visible product. Learn the difference.

26. TAO.app is the official front door
   Date: 2026-07-16
   Cluster: platforms
   Primary keyword: TAO.app Bittensor
   Review URL: /field-school/review/bittensor-field-school-tao-app/
   Summary: Use TAO.app for explorer data, validator performance, tokenomics and Savant style discovery.

27. TaoSwap shows the market as a living table
   Date: 2026-07-18
   Cluster: platforms
   Primary keyword: TaoSwap Bittensor
   Review URL: /field-school/review/bittensor-field-school-taoswap/
   Summary: Use TaoSwap data for market cap, flow, price evolution, holders and conviction across subnets.

28. TaoFlows turns staking into a tape
   Date: 2026-07-19
   Cluster: platforms
   Primary keyword: TaoFlows Bittensor
   Review URL: /field-school/review/bittensor-field-school-taoflows/
   Summary: Use TaoFlows to watch real time liquidity movement instead of waiting for weekly summaries.

29. Backprop is a screener for the dTAO market
   Date: 2026-07-21
   Cluster: platforms
   Primary keyword: Backprop Finance Bittensor
   Review URL: /field-school/review/bittensor-field-school-backprop/
   Summary: Use Backprop for market cap, volume, top gainers, subnet categories and trading context.

30. SubnetRadar is for risk and anomaly hunting
   Date: 2026-07-23
   Cluster: platforms
   Primary keyword: SubnetRadar Bittensor
   Review URL: /field-school/review/bittensor-field-school-subnetradar/
   Summary: Use SubnetRadar to monitor health, conviction, signals and events that deserve follow up.

31. AlphaGap reads what investors miss between code and market
   Date: 2026-07-25
   Cluster: platforms
   Primary keyword: AlphaGap Bittensor
   Review URL: /field-school/review/bittensor-field-school-alphagap/
   Summary: Use AlphaGap style thinking to connect dev updates, social velocity, wallets and valuation gaps.

32. IntoTao is the ecosystem map for newcomers
   Date: 2026-07-26
   Cluster: platforms
   Primary keyword: IntoTao Bittensor
   Review URL: /field-school/review/bittensor-field-school-intotao/
   Summary: Use IntoTao to discover resources, tools, wallets, education and project surfaces without drowning.

33. TaoStats is the encyclopedia with an API spine
   Date: 2026-07-28
   Cluster: platforms
   Primary keyword: TaoStats Bittensor
   Review URL: /field-school/review/bittensor-field-school-taostats/
   Summary: Use TaoStats docs, explorer, staking views and API references to cross check almost everything.

34. APIs turn Bittensor from story into evidence
   Date: 2026-07-30
   Cluster: data
   Primary keyword: Bittensor API
   Review URL: /field-school/review/bittensor-field-school-tao-api/
   Summary: Learn which APIs expose subnets, metagraphs, holders, transactions, slippage and social data.

35. Subnet categories are useful until they become lazy
   Date: 2026-08-01
   Cluster: taxonomy
   Primary keyword: Bittensor subnet categories
   Review URL: /field-school/review/bittensor-field-school-subnet-categories/
   Summary: LLM, compute, data, agents, media and finance subnets need different evaluation criteria.

36. LLM subnets compete on routing, quality and cost
   Date: 2026-08-02
   Cluster: taxonomy
   Primary keyword: Bittensor LLM subnets
   Review URL: /field-school/review/bittensor-field-school-llm-subnets/
   Summary: Understand what to inspect in inference, model development and language related subnets.

37. Compute subnets sell capacity and reliability
   Date: 2026-08-04
   Cluster: taxonomy
   Primary keyword: Bittensor compute subnets
   Review URL: /field-school/review/bittensor-field-school-compute-subnets/
   Summary: Read GPU, serverless and infrastructure subnets through uptime, demand, utilization and pricing.

38. Data subnets live or die by provenance and demand
   Date: 2026-08-06
   Cluster: taxonomy
   Primary keyword: Bittensor data subnets
   Review URL: /field-school/review/bittensor-field-school-data-subnets/
   Summary: Scraping, storage and data generation subnets need buyers, quality controls and audit trails.

39. Agent subnets should be judged by tasks completed
   Date: 2026-08-08
   Cluster: taxonomy
   Primary keyword: Bittensor agent subnets
   Review URL: /field-school/review/bittensor-field-school-agent-subnets/
   Summary: Agents are narrative magnets. Learn to ask what the agent actually does, for whom and how often.

40. Media subnets turn attention into a measurable commodity
   Date: 2026-08-09
   Cluster: taxonomy
   Primary keyword: Bittensor media subnets
   Review URL: /field-school/review/bittensor-field-school-media-subnets/
   Summary: Bitcast, video, content and verification subnets show how Bittensor can reward media production.

41. Financial subnets need risk language, not hype language
   Date: 2026-08-11
   Cluster: taxonomy
   Primary keyword: Bittensor DeFi subnets
   Review URL: /field-school/review/bittensor-field-school-defi-subnets/
   Summary: Lending, trading, liquidity and prediction subnets must be read through counterparties and failure modes.

42. The red flags that make a subnet hard to trust
   Date: 2026-08-13
   Cluster: risk
   Primary keyword: Bittensor subnet red flags
   Review URL: /field-school/review/bittensor-field-school-red-flags/
   Summary: No repo, thin docs, unclear scoring, fake volume, missing product and bad incentives deserve attention.

43. A fragile subnet can still be honest
   Date: 2026-08-15
   Cluster: risk
   Primary keyword: Bittensor subnet risk
   Review URL: /field-school/review/bittensor-field-school-scam-vs-fragile/
   Summary: Learn the difference between malicious behavior, weak design, early experimentation and honest failure.

44. Validator selection is delegated judgment
   Date: 2026-08-16
   Cluster: staking
   Primary keyword: Bittensor validator selection
   Review URL: /field-school/review/bittensor-field-school-validator-selection/
   Summary: Choosing a validator means choosing how your stake is represented across work markets.

45. Yield without context is the easiest trap in TAO
   Date: 2026-08-18
   Cluster: staking
   Primary keyword: Bittensor staking yield
   Review URL: /field-school/review/bittensor-field-school-yield/
   Summary: APY, emissions, alpha price and slippage can point in different directions.

46. Wallet flows reveal behavior before explanations do
   Date: 2026-08-20
   Cluster: data
   Primary keyword: Bittensor wallet analysis
   Review URL: /field-school/review/bittensor-field-school-wallet-analysis/
   Summary: Track accumulation, rotation, concentration and exits across subnet markets.

47. GitHub research is a habit more than a metric
   Date: 2026-08-22
   Cluster: research
   Primary keyword: Bittensor GitHub research
   Review URL: /field-school/review/bittensor-field-school-github-research/
   Summary: Commits, releases, issues and docs should be read as evidence of shipping quality.

48. How to write a subnet thesis without fooling yourself
   Date: 2026-08-23
   Cluster: research
   Primary keyword: Bittensor subnet thesis
   Review URL: /field-school/review/bittensor-field-school-writing-thesis/
   Summary: Turn product, incentives, code, flows and risk into a thesis you can update.

49. Build your Bittensor research terminal
   Date: 2026-08-25
   Cluster: workflow
   Primary keyword: Bittensor research terminal
   Review URL: /field-school/review/bittensor-field-school-research-terminal/
   Summary: Assemble the daily desk: docs, GitHub, TAO.app, TaoFlows, TaoSwap, Backprop, SubnetRadar, AlphaGap and your notes.

50. The subnet thesis exam
   Date: 2026-08-27
   Cluster: workflow
   Primary keyword: Bittensor thesis exam
   Review URL: /field-school/review/bittensor-field-school-thesis-exam/
   Summary: The final module gives a repeatable exam for judging any subnet from zero.

## Source desk

- [Bittensor docs](https://docs.learnbittensor.org/)
- [Bittensor SDK GitHub](https://github.com/latent-to/bittensor)
- [Subtensor GitHub](https://github.com/opentensor/subtensor)
- [TAO.app](https://www.tao.app/)
- [TAO.app API docs](https://api.tao.app/docs)
- [TaoStats docs](https://docs.taostats.io/)
- [TaoSwap API](https://api.taoswap.org/subnets)
- [TaoFlows](https://taoflows.app/)
- [Backprop Finance](https://backprop.finance/)
- [IntoTao](https://www.intotao.app/)
- [SubnetRadar](https://subnetradar.com/)
- [AlphaGap](https://www.alphagap.io/)
- [SubnetStats](https://www.subnetstats.app/)
