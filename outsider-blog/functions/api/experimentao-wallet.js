const TAOSWAP_API = 'https://api.taoswap.org';
const ACCOUNT = '5GLCEsYRq3zTfabT3WsPMetqg5eofRsUgsqPuGgmuZZgjogL';
const WALLET_URL = `https://taoswap.org/portfolio/${ACCOUNT}`;
const RAO_PER_TAO = 1_000_000_000;

const numberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const finiteNumber = (value, fallback = 0) => {
  const number = numberOrNull(value);
  return number === null ? fallback : number;
};

const raoToTao = (value) => {
  const number = numberOrNull(value);
  return number === null ? null : number / RAO_PER_TAO;
};

const fetchJson = async (path) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(`${TAOSWAP_API}${path}`, {
      headers: {
        accept: 'application/json',
        'user-agent': 'TaoOutsiderBlog/1.0',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`TaoSwap request failed with ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const shortAddress = (address) => `${address.slice(0, 5)}...${address.slice(-4)}`;

const normalizeSubnetName = (subnet) => {
  const raw = subnet?.identity?.name || subnet?.name || '';
  if (!raw) return `Subnet ${subnet?.id ?? ''}`.trim();
  return raw;
};

const normalizeChange = (change) => ({
  tao: raoToTao(change?.tao_abs),
  taoPct: numberOrNull(change?.tao_pct),
  usd: numberOrNull(change?.usd_abs),
  usdPct: numberOrNull(change?.usd_pct),
});

const normalizeTransaction = (item) => {
  const isStake = Boolean(item.subnet_id || item.dest_subnet_id || item.alpha_amount);
  const operation = item.operation || (item.sender ? 'transfer' : 'activity');
  return {
    type: isStake ? 'stake' : 'transfer',
    operation,
    netuid: numberOrNull(item.subnet_id ?? item.dest_subnet_id),
    timestamp: item.timestamp || null,
    block: numberOrNull(item.block),
    taoAmount: raoToTao(item.amount_rao),
    alphaAmount: raoToTao(item.alpha_amount),
  };
};

const latestIso = (...values) => {
  const dates = values
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => Number.isFinite(date.valueOf()))
    .sort((a, b) => b.valueOf() - a.valueOf());
  return dates[0]?.toISOString() || new Date().toISOString();
};

const sortBy = (field, direction = 'desc') => (a, b) => {
  const av = finiteNumber(a[field], direction === 'desc' ? -Infinity : Infinity);
  const bv = finiteNumber(b[field], direction === 'desc' ? -Infinity : Infinity);
  return direction === 'desc' ? bv - av : av - bv;
};

export async function onRequestGet() {
  try {
    const [
      accountPayload,
      balancePayload,
      pnlPayload,
      incomePayload,
      transactionsPayload,
      subnetsPayload,
    ] = await Promise.all([
      fetchJson(`/accounts/?q=${ACCOUNT}`),
      fetchJson(`/portfolio-balance/?account=${ACCOUNT}`),
      fetchJson(`/portfolio-pnl-apy/?account=${ACCOUNT}&include_subnets=true`),
      fetchJson(`/portfolio-income/?account=${ACCOUNT}`),
      fetchJson(`/account-transactions/?account=${ACCOUNT}&limit=20&offset=0`),
      fetchJson('/subnets/'),
    ]);

    const account = accountPayload?.results?.[0] || {};
    const balanceHistory = Array.isArray(balancePayload?.results) ? balancePayload.results : [];
    const current = balanceHistory.at(-1) || {};
    const heldNetuids = Array.isArray(balancePayload?.held_netuids) ? balancePayload.held_netuids : [];

    const subnetMap = new Map(
      (subnetsPayload?.results || []).map((subnet) => [
        Number(subnet.id),
        {
          id: Number(subnet.id),
          name: normalizeSubnetName(subnet),
          symbol: subnet.symbol || '',
          price: numberOrNull(subnet.price),
          change24h: numberOrNull(subnet.price_evolution_h_24),
          marketCapTao: numberOrNull(subnet.market_cap),
        },
      ]),
    );

    const subnetRows = (pnlPayload?.subnets || [])
      .map((row) => {
        const netuid = Number(row.netuid);
        const meta = subnetMap.get(netuid) || { id: netuid, name: `Subnet ${netuid}`, symbol: '' };
        const apy = row.apy || {};
        const pnl = row.pnl || {};
        return {
          netuid,
          name: meta.name,
          symbol: meta.symbol,
          priceChange24h: meta.change24h,
          marketCapTao: meta.marketCapTao,
          valueChangeAllTao: raoToTao(apy.value_change_tao?.all),
          valueChange30dTao: raoToTao(apy.value_change_tao?.['30d']),
          valueChange7dTao: raoToTao(apy.value_change_tao?.['7d']),
          valueChangeAllUsd: numberOrNull(apy.value_change_usd?.all),
          valueChange30dUsd: numberOrNull(apy.value_change_usd?.['30d']),
          valueChange7dUsd: numberOrNull(apy.value_change_usd?.['7d']),
          apyTao7d: numberOrNull(apy.tao?.['7d']),
          apyTao30d: numberOrNull(apy.tao?.['30d']),
          apyTaoAll: numberOrNull(apy.tao?.all),
          apyUsd7d: numberOrNull(apy.usd?.['7d']),
          apyUsd30d: numberOrNull(apy.usd?.['30d']),
          unrealizedTao: raoToTao(pnl.unrealized?.tao?.wac),
          realizedTao: raoToTao(pnl.realized?.tao?.wac),
          change24hTao: raoToTao(
            finiteNumber(pnl.change_24h?.unrealized?.tao?.wac) +
            finiteNumber(pnl.change_24h?.realized?.tao?.wac),
          ),
        };
      })
      .filter((row) => row.netuid > 0);

    const positionedRows = subnetRows.filter((row) => heldNetuids.includes(row.netuid));
    const rowsForRanking = positionedRows.length > 0 ? positionedRows : subnetRows;
    const rowsWithAllChange = rowsForRanking.filter((row) => row.valueChangeAllTao !== null);
    const winners = rowsWithAllChange.slice().sort(sortBy('valueChangeAllTao', 'desc')).slice(0, 5);
    const laggards = rowsWithAllChange.slice().sort(sortBy('valueChangeAllTao', 'asc')).slice(0, 5);

    const stakeTransfers = Array.isArray(transactionsPayload?.stake_transfers)
      ? transactionsPayload.stake_transfers
      : [];
    const transfers = Array.isArray(transactionsPayload?.transfers)
      ? transactionsPayload.transfers
      : [];
    const activity = [...stakeTransfers, ...transfers]
      .map(normalizeTransaction)
      .sort((a, b) => new Date(b.timestamp || 0).valueOf() - new Date(a.timestamp || 0).valueOf())
      .slice(0, 8);

    const history = balanceHistory.slice(-60).map((item) => ({
      date: item.date,
      totalTao: raoToTao(item.total_tao),
      totalUsd: numberOrNull(item.total_usd),
      alphaInTao: raoToTao(item.staked_alpha_in_tao),
    }));

    const rank = balancePayload?.rank || {};
    const dataAsOf = latestIso(
      balancePayload?.value_change?.as_of,
      incomePayload?.as_of,
      pnlPayload?.as_of,
      current.date,
    );

    return Response.json({
      source: 'TaoSwap',
      updatedAt: new Date().toISOString(),
      dataAsOf,
      wallet: {
        address: ACCOUNT,
        shortAddress: shortAddress(ACCOUNT),
        url: WALLET_URL,
      },
      overview: {
        accountKnown: Boolean(balancePayload?.account_known || pnlPayload?.account_known),
        rank: numberOrNull(rank.rank ?? account.rank),
        rankAlpha: numberOrNull(rank.rank_alpha ?? account.rank_alpha),
        totalAccounts: numberOrNull(rank.total_accounts),
        heldSubnets: heldNetuids.length,
        includesRoot: finiteNumber(current.staked_tao ?? account.staked_tao) > 0,
        freeTao: raoToTao(current.free ?? account.free),
        rootTao: raoToTao(current.staked_tao ?? account.staked_tao),
        alphaInTao: raoToTao(current.staked_alpha_in_tao ?? account.staked_alpha_in_tao),
        totalTao: raoToTao(current.total_tao ?? account.total_tao),
        totalUsd: numberOrNull(current.total_usd ?? account.total_usd),
        changes: {
          '24h': normalizeChange(balancePayload?.value_change?.['24h']),
          '7d': normalizeChange(balancePayload?.value_change?.['7d']),
          '30d': normalizeChange(balancePayload?.value_change?.['30d']),
        },
      },
      income: incomePayload?.windows || {},
      pnl: {
        realizedTao: raoToTao(pnlPayload?.pnl?.realized?.tao?.wac),
        unrealizedTao: raoToTao(pnlPayload?.pnl?.unrealized?.tao?.wac),
        valueChangeAllTao: raoToTao(pnlPayload?.apy?.value_change_tao?.all),
        valueChange30dTao: raoToTao(pnlPayload?.apy?.value_change_tao?.['30d']),
        valueChange7dTao: raoToTao(pnlPayload?.apy?.value_change_tao?.['7d']),
        apyTao7d: numberOrNull(pnlPayload?.apy?.tao?.['7d']),
        apyTao30d: numberOrNull(pnlPayload?.apy?.tao?.['30d']),
        apyUsd7d: numberOrNull(pnlPayload?.apy?.usd?.['7d']),
        apyUsd30d: numberOrNull(pnlPayload?.apy?.usd?.['30d']),
      },
      history,
      subnets: {
        winners,
        laggards,
        sampled: positionedRows.length,
      },
      activity,
    }, {
      headers: {
        'cache-control': 'public, max-age=60, s-maxage=180, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: 'ExperimenTAO Wallet data is temporarily unavailable.',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 502,
        headers: {
          'cache-control': 'no-store',
        },
      },
    );
  }
}
