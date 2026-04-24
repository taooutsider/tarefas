const TAOFLOWS_API = 'https://taoflows.app';
const WINDOW_MS = 60 * 60 * 1000;
const BUCKET_MS = 5 * 60 * 1000;

const finiteNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const fetchJson = async (path) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${TAOFLOWS_API}${path}`, {
      headers: {
        accept: 'application/json',
        'user-agent': 'TaoOutsiderBlog/1.0',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`TaoFlows request failed with ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const normalizeTransaction = (transaction) => {
  const amountTao = finiteNumber(transaction.data?.amountTao);
  const netuid = finiteNumber(transaction.data?.netuid);
  const type = transaction.eventType === 'StakeRemoved' ? 'Sell' : 'Buy';

  return {
    blockNumber: finiteNumber(transaction.blockNumber),
    timestamp: transaction.timestamp || null,
    type,
    netuid,
    subnet: `SN${netuid}`,
    amountTao,
    finalized: Boolean(transaction.finalized),
  };
};

const normalizeBar = (bar) => {
  const buyVolume = finiteNumber(bar.buyVolume);
  const sellVolume = finiteNumber(bar.sellVolume);
  const buyCount = finiteNumber(bar.buyCount);
  const sellCount = finiteNumber(bar.sellCount);

  return {
    bucketStart: finiteNumber(bar.bucketStart),
    buyVolume,
    sellVolume,
    netVolume: buyVolume - sellVolume,
    buyCount,
    sellCount,
    transactions: buyCount + sellCount,
  };
};

export async function onRequestGet() {
  try {
    const from = Date.now() - WINDOW_MS;
    const query = `from=${from}&types=StakeAdded,StakeRemoved`;

    const [transactionsPayload, liquidityPayload] = await Promise.all([
      fetchJson(`/api/transactions?${query}&limit=120&sortBy=time&sortOrder=desc&includeTotal=true`),
      fetchJson(`/api/liquidity-stream?${query}&bucketSize=${BUCKET_MS}`),
    ]);

    const transactions = (transactionsPayload.transactions || []).map(normalizeTransaction);
    const bars = (liquidityPayload.bars || []).map(normalizeBar);

    const buyVolumeTao = bars.reduce((sum, bar) => sum + bar.buyVolume, 0);
    const sellVolumeTao = bars.reduce((sum, bar) => sum + bar.sellVolume, 0);
    const buyCount = bars.reduce((sum, bar) => sum + bar.buyCount, 0);
    const sellCount = bars.reduce((sum, bar) => sum + bar.sellCount, 0);
    const activeSubnets = new Set(transactions.map((item) => item.netuid).filter(Boolean)).size;
    const latest = transactions[0] || null;

    const response = {
      source: 'TaoFlows',
      updatedAt: new Date().toISOString(),
      window: '1H',
      overview: {
        totalTransactions: finiteNumber(transactionsPayload.total, transactions.length),
        sampledTransactions: transactions.length,
        buyVolumeTao,
        sellVolumeTao,
        netVolumeTao: buyVolumeTao - sellVolumeTao,
        buyCount,
        sellCount,
        activeSubnets,
        latestBlock: latest?.blockNumber || null,
      },
      latestTransaction: latest,
      bars: bars.slice(-12),
    };

    return Response.json(response, {
      headers: {
        'cache-control': 'public, max-age=10, s-maxage=20, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: 'TaoFlows pulse is temporarily unavailable.',
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
