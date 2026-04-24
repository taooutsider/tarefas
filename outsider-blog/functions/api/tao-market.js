const BINANCE_BASE = 'https://api.binance.com';
const SYMBOL = 'TAOUSDT';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=20, s-maxage=60, stale-while-revalidate=120',
    },
  });
}

async function readJson(path) {
  const response = await fetch(`${BINANCE_BASE}${path}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Binance request failed: ${response.status}`);
  }

  return response.json();
}

export async function onRequestGet() {
  try {
    const [ticker, openInterest, klines1h, klines4h, klines1d] = await Promise.all([
      readJson(`/api/v3/ticker/24hr?symbol=${SYMBOL}`),
      fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${SYMBOL}`, {
        headers: { Accept: 'application/json' },
      }).then((response) => response.ok ? response.json() : null),
      readJson(`/api/v3/klines?symbol=${SYMBOL}&interval=1h&limit=24`),
      readJson(`/api/v3/klines?symbol=${SYMBOL}&interval=4h&limit=24`),
      readJson(`/api/v3/klines?symbol=${SYMBOL}&interval=1d&limit=30`),
    ]);

    const toCloses = (klines) => klines.map((item) => Number(item[4])).filter(Number.isFinite);
    const price = Number(ticker.lastPrice);
    const low = Number(ticker.lowPrice);
    const high = Number(ticker.highPrice);
    const range = high - low;
    const rangePosition = range > 0 ? ((price - low) / range) * 100 : null;

    return json({
      symbol: SYMBOL,
      pair: 'TAO/USDT',
      source: 'Binance Spot',
      futuresSource: 'Binance USDⓈ-M Futures',
      price,
      changePercent: Number(ticker.priceChangePercent),
      high,
      low,
      volume: Number(ticker.volume),
      quoteVolume: Number(ticker.quoteVolume),
      rangePosition,
      openInterest: openInterest ? Number(openInterest.openInterest) : null,
      candles: {
        '1h': toCloses(klines1h),
        '4h': toCloses(klines4h),
        '1d': toCloses(klines1d),
      },
      closes: toCloses(klines1h),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return json({
      error: 'TAO market data is temporarily unavailable.',
      detail: error instanceof Error ? error.message : 'Unknown error',
    }, 502);
  }
}
