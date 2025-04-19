
export const API_RATE_LIMITS = {
  UNISWAP: 5,      // 5 requests per second
  SUSHISWAP: 5,    // 5 requests per second
  PANCAKESWAP: 5,  // 5 requests per second
  JUPITER: 10,     // 10 requests per second
  ORCA: 5,         // 5 requests per second
  RAYDIUM: 5,      // 5 requests per second
  BALANCER: 5,     // 5 requests per second
  CURVE: 5,        // 5 requests per second
  DEXSCREENER: 5,  // 5 requests per second
};

export const DEX_FEES = {
  UNISWAP: 0.003,      // 0.3%
  SUSHISWAP: 0.003,    // 0.3%
  PANCAKESWAP: 0.0025, // 0.25%
  JUPITER: 0.0035,     // 0.35%
  ORCA: 0.003,         // 0.3%
  RAYDIUM: 0.003,      // 0.3%
  BALANCER: 0.002,     // 0.2%
  CURVE: 0.0004        // 0.04%
};

export const MIN_LIQUIDITY = {
  LOW: 10000,      // $10k minimum for low-risk trades
  MEDIUM: 50000,   // $50k minimum for medium-risk trades
  HIGH: 100000     // $100k minimum for high-risk trades
};

export const PLATFORM_FEE_PERCENTAGE = 0.001; // 0.1% platform fee

export const GAS_ESTIMATES = {
  ETHEREUM: {
    SWAP: 150000,
    APPROVE: 50000
  },
  BSC: {
    SWAP: 200000,
    APPROVE: 50000
  },
  POLYGON: {
    SWAP: 250000,
    APPROVE: 60000
  },
  ARBITRUM: {
    SWAP: 700000,
    APPROVE: 100000
  },
  BASE: {
    SWAP: 150000,
    APPROVE: 50000
  },
  OPTIMISM: {
    SWAP: 200000,
    APPROVE: 50000
  }
};
