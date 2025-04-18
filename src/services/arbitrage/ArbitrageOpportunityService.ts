
import { TokenInfo } from '@/services/tokenListService';
import { PriceQuote } from '@/services/dex/types';
import { ArbitrageOpportunity } from './types';
import { getDexFee, getGasEstimate, getNetworkName } from './utils';

export class ArbitrageOpportunityService {
  private static instance: ArbitrageOpportunityService;

  private constructor() {}

  public static getInstance(): ArbitrageOpportunityService {
    if (!ArbitrageOpportunityService.instance) {
      ArbitrageOpportunityService.instance = new ArbitrageOpportunityService();
    }
    return ArbitrageOpportunityService.instance;
  }

  public findOpportunities(
    priceQuotes: Record<string, PriceQuote>,
    baseToken: TokenInfo,
    quoteToken: TokenInfo,
    minProfitPercentage: number,
    investmentAmount: number,
    networkName: string,
    gasEstimate: number,
    approvalGasEstimate: number
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    const dexNames = Object.keys(priceQuotes);

    for (let i = 0; i < dexNames.length; i++) {
      for (let j = i + 1; j < dexNames.length; j++) {
        const dex1 = dexNames[i];
        const dex2 = dexNames[j];
        const quote1 = priceQuotes[dex1];
        const quote2 = priceQuotes[dex2];

        if (!quote1 || !quote2) continue;

        const potentialOpportunity = this.analyzePricePair(
          dex1,
          dex2,
          quote1,
          quote2,
          baseToken,
          quoteToken,
          minProfitPercentage,
          investmentAmount,
          networkName,
          gasEstimate,
          approvalGasEstimate
        );

        if (potentialOpportunity) {
          opportunities.push(potentialOpportunity);
        }
      }
    }

    return opportunities;
  }

  private analyzePricePair(
    dex1: string,
    dex2: string,
    quote1: PriceQuote,
    quote2: PriceQuote,
    baseToken: TokenInfo,
    quoteToken: TokenInfo,
    minProfitPercentage: number,
    investmentAmount: number,
    networkName: string,
    gasEstimate: number,
    approvalGasEstimate: number
  ): ArbitrageOpportunity | null {
    let buyDex, sellDex, buyPrice, sellPrice, buyQuote, sellQuote;

    if (quote1.price < quote2.price) {
      buyDex = dex1;
      sellDex = dex2;
      buyPrice = quote1.price;
      sellPrice = quote2.price;
      buyQuote = quote1;
      sellQuote = quote2;
    } else {
      buyDex = dex2;
      sellDex = dex1;
      buyPrice = quote2.price;
      sellPrice = quote1.price;
      buyQuote = quote2;
      sellQuote = quote1;
    }

    const priceDiff = Math.abs(buyPrice - sellPrice);
    const avgPrice = (buyPrice + sellPrice) / 2;
    const priceDifferencePercentage = (priceDiff / avgPrice) * 100;

    if (priceDifferencePercentage < minProfitPercentage) {
      return null;
    }

    const buyFee = (buyQuote.fees || 0.003) * investmentAmount;
    const sellFee = (sellQuote.fees || 0.003) * investmentAmount;
    const tradingFees = buyFee + sellFee;

    const buyLiquidity = buyQuote.liquidityUSD || 1000000;
    const sellLiquidity = sellQuote.liquidityUSD || 1000000;
    
    const buyPriceImpact = Math.min((investmentAmount / buyLiquidity) * 100, 5) / 100;
    const sellPriceImpact = Math.min((investmentAmount / sellLiquidity) * 100, 5) / 100;
    
    const effectiveBuyPrice = buyPrice * (1 + buyPriceImpact);
    const effectiveSellPrice = sellPrice * (1 - sellPriceImpact);
    
    const estimatedTokenAmount = investmentAmount / effectiveBuyPrice;
    const sellAmount = estimatedTokenAmount * effectiveSellPrice;
    
    const estimatedProfit = sellAmount - investmentAmount;
    const totalGasFee = gasEstimate + approvalGasEstimate;
    const platformFee = investmentAmount * 0.005;
    
    const netProfit = estimatedProfit - tradingFees - totalGasFee - platformFee;
    const netProfitPercentage = (netProfit / investmentAmount) * 100;

    if (netProfit <= 0) {
      return null;
    }

    const minRequiredLiquidity = investmentAmount * 3;
    if (buyLiquidity < minRequiredLiquidity || sellLiquidity < minRequiredLiquidity) {
      return null;
    }

    return {
      id: `${baseToken.symbol}-${quoteToken.symbol}-${buyDex}-${sellDex}-${Date.now()}`,
      tokenPair: `${baseToken.symbol}/${quoteToken.symbol}`,
      token: baseToken.symbol,
      network: networkName,
      buyDex,
      sellDex,
      buyPrice,
      sellPrice,
      priceDifferencePercentage,
      liquidity: Math.min(buyLiquidity, sellLiquidity),
      estimatedProfit,
      estimatedProfitPercentage: priceDifferencePercentage,
      gasFee: totalGasFee,
      netProfit,
      netProfitPercentage,
      baseToken,
      quoteToken,
      timestamp: Date.now(),
      buyGasFee: gasEstimate,
      sellGasFee: approvalGasEstimate,
      tradingFees,
      platformFee,
      investmentAmount
    };
  }
}
