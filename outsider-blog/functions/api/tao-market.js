const TAOSWAP_API = 'https://api.taoswap.org';

const finiteNumber = (value, fallback = null) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': status === 200
      ? 'public, max-age=60, s-maxage=180, stale-while-revalidate=300'
      : 'no-store',
  },
});

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

const pctChange = (current, previous) => {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / previous) * 100;
};

const closes = (items) => items
  .map((item) => finiteNumber(item.price))
  .filter(Number.isFinite);

export async function onRequestGet() {
  try {
    const [historyPayload, rootPayload] = await Promise.all([
      fetchJson('/price-history/?limit=31&order=asc'),
      fetchJson('/subnets/0/'),
    ]);

    const history = Array.isArray(historyPayload?.results) ? historyPayload.results : [];
    if (history.length < 2) {
      throw new Error('TaoSwap price history returned too few points.');
    }

    const latest = history.at(-1);
    const previous = history.at(-2);
    const historyCloses = closes(history);
    const rootPrice = finiteNumber(rootPayload?.fdv_usd) && finiteNumber(rootPayload?.fdv)
      ? finiteNumber(rootPayload.fdv_usd) / finiteNumber(rootPayload.fdv)
      : null;
    const price = finiteNumber(rootPrice, finiteNumber(latest.price));
    const previousPrice = finiteNumber(previous.price);
    const low = Math.min(...historyCloses);
    const high = Math.max(...historyCloses);
    const range = high - low;
    const volumeUsd = finiteNumber(latest.volume, null);
    const volumeTao = Number.isFinite(volumeUsd) && Number.isFinite(price) && price > 0
      ? volumeUsd / price
      : null;

    return json({
      symbol: 'TAOUSD',
      pair: 'TAO/USD',
      source: 'TaoSwap',
      sourceUrl: 'https://api.taoswap.org/price-history/',
      price,
      changePercent: pctChange(price, previousPrice),
      high,
      low,
      volume: volumeTao,
      quoteVolume: volumeUsd,
      rangePosition: range > 0 ? ((price - low) / range) * 100 : null,
      openInterest: null,
      candles: {
        '1d': historyCloses,
        '7d': closes(history.slice(-7)),
        '30d': historyCloses,
      },
      closes: historyCloses,
      history: history.map((item) => ({
        date: item.date,
        price: finiteNumber(item.price),
        volumeUsd: finiteNumber(item.volume),
      })),
      updatedAt: new Date().toISOString(),
      dataAsOf: latest.date,
    });
  } catch (error) {
    return json({
      error: 'TAO market data is temporarily unavailable.',
      detail: error instanceof Error ? error.message : 'Unknown error',
    }, 502);
  }
}
