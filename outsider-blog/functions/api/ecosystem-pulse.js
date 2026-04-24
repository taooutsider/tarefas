const TAOSWAP_API = 'https://api.taoswap.org';

const finiteNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const fetchJson = async (path) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

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

const normalizeSubnet = (subnet) => {
  const inflow = finiteNumber(subnet.inflow);
  const outflow = finiteNumber(subnet.outflow);

  return {
    id: finiteNumber(subnet.id),
    name: subnet.identity?.name || subnet.name || `Subnet ${subnet.id}`,
    symbol: subnet.symbol || '',
    image: subnet.identity?.image || null,
    price: finiteNumber(subnet.price),
    change1h: finiteNumber(subnet.price_evolution_h_1),
    change24h: finiteNumber(subnet.price_evolution_h_24),
    change7d: finiteNumber(subnet.price_evolution_d_7),
    marketCapTao: finiteNumber(subnet.market_cap),
    emissionPercent: finiteNumber(subnet.emission_percent),
    inflow,
    outflow,
    netFlow: inflow - outflow,
    rootInPool: finiteNumber(subnet.root_in_pool),
    alphaInPool: finiteNumber(subnet.alpha_in_pool),
    alphaStake: finiteNumber(subnet.alpha_stake),
    holders: finiteNumber(subnet.holders_count),
    nakamoto: finiteNumber(subnet.nakamoto_coefficient),
    top10Share: finiteNumber(subnet.top10_share),
    activeMiners: finiteNumber(subnet.active_miners),
    registrationCost: finiteNumber(subnet.registration_cost),
  };
};

const normalizeValidator = (validator) => ({
  name: validator.identity?.name || 'Unknown validator',
  hotkey: validator.validator_hotkey || '',
  take: finiteNumber(validator.take),
  apy7d: finiteNumber(validator.apy_7d),
  totalStake: finiteNumber(validator.total_stake),
  delegators: finiteNumber(validator.count_delegators),
  dominance: finiteNumber(validator.dominance),
});

const sortDesc = (field) => (a, b) => finiteNumber(b[field]) - finiteNumber(a[field]);
const sortAsc = (field) => (a, b) => finiteNumber(a[field]) - finiteNumber(b[field]);

const top = (items, sorter, size = 5) => items.slice().sort(sorter).slice(0, size);

export async function onRequestGet() {
  try {
    const [subnetsPayload, validatorsPayload] = await Promise.all([
      fetchJson('/subnets/'),
      fetchJson('/validators/'),
    ]);

    const subnets = (subnetsPayload.results || [])
      .map(normalizeSubnet)
      .filter((subnet) => subnet.id !== 0);

    const validators = (validatorsPayload.results || [])
      .map(normalizeValidator);

    const totalMarketCapTao = subnets.reduce((sum, subnet) => sum + subnet.marketCapTao, 0);
    const totalRootLiquidityTao = subnets.reduce((sum, subnet) => sum + finiteNumber(subnet.rootInPool), 0);
    const totalActiveMiners = subnets.reduce((sum, subnet) => sum + subnet.activeMiners, 0);
    const emittingSubnets = subnets.filter((subnet) => subnet.emissionPercent > 0).length;
    const netFlowTao = subnets.reduce((sum, subnet) => sum + subnet.netFlow, 0);

    const response = {
      source: 'TaoSwap',
      updatedAt: new Date().toISOString(),
      overview: {
        totalSubnets: subnets.length,
        totalMarketCapTao,
        totalActiveMiners,
        emittingSubnets,
        netFlowTao,
        totalRootLiquidityTao,
      },
      subnets: {
        topGainers24h: top(subnets.filter((item) => item.change24h > 0), sortDesc('change24h')),
        topLosers24h: top(subnets.filter((item) => item.change24h < 0), sortAsc('change24h')),
        topMarketCaps: top(subnets, sortDesc('marketCapTao')),
        topInflows: top(subnets.filter((item) => item.inflow > 0), sortDesc('inflow')),
        topOutflows: top(subnets.filter((item) => item.outflow > 0), sortDesc('outflow')),
        heatmap: top(subnets, sortDesc('marketCapTao'), 72).map((subnet) => ({
          id: subnet.id,
          name: subnet.name,
          change24h: subnet.change24h,
          marketCapTao: subnet.marketCapTao,
        })),
      },
      validators: {
        topStake: top(validators, sortDesc('totalStake')),
        topDelegators: top(validators, sortDesc('delegators')),
      },
    };

    return Response.json(response, {
      headers: {
        'cache-control': 'public, max-age=60, s-maxage=180, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: 'Ecosystem pulse is temporarily unavailable.',
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
